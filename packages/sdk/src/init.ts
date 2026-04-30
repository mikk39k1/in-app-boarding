import { ApiClient } from "./client";
import { checkEnvironment } from "./env";
import { log } from "./log";

export interface InitOptions {
  apiKey: string;
  /**
   * Base URL of the in-app boarding backend. If not provided, defaults to
   * the same origin (works when the dashboard is deployed alongside the
   * client app, which is fine for the MVP demo with separate ports).
   */
  apiUrl?: string;
  /**
   * Override the URL search-param prefix used to detect builder launches.
   * Defaults to "ib_". So the SDK looks for ?ib_builder_token=... and
   * ?ib_flow=...
   */
  paramPrefix?: string;
}

export interface SdkContext {
  apiKey: string;
  apiUrl: string;
  paramPrefix: string;
  client: ApiClient;
  builderJwt?: string;
  builderFlowId?: string;
  isBuilder: boolean;
}

let active: SdkContext | null = null;

export function getContext(): SdkContext | null {
  return active;
}

function defaultApiUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export async function init(opts: InitOptions): Promise<SdkContext | null> {
  if (typeof window === "undefined") {
    return null;
  }
  if (active) {
    log.warn("init() called twice — ignoring");
    return active;
  }

  const check = checkEnvironment(opts.apiKey);
  log.debugEnabled = check.debug;
  if (check.level === "warn") log.warn(check.message);
  if (check.level === "error") {
    log.error(check.message);
    return null;
  }
  if (check.level === "info") log.info(check.message);

  const ctx: SdkContext = {
    apiKey: opts.apiKey,
    apiUrl: opts.apiUrl ?? defaultApiUrl(),
    paramPrefix: opts.paramPrefix ?? "ib_",
    client: new ApiClient({
      apiKey: opts.apiKey,
      apiUrl: opts.apiUrl ?? defaultApiUrl(),
    }),
    isBuilder: false,
  };
  active = ctx;

  // Detect a builder launch via URL parameters.
  const params = new URLSearchParams(window.location.search);
  const builderToken = params.get(`${ctx.paramPrefix}builder_token`);
  const flowParam = params.get(`${ctx.paramPrefix}flow`);

  if (builderToken) {
    try {
      const exchange = await ctx.client.exchangeBuilderToken(builderToken);
      ctx.builderJwt = exchange.jwt;
      ctx.builderFlowId = exchange.flowId ?? flowParam ?? undefined;
      ctx.isBuilder = true;
      ctx.client.setJwt(exchange.jwt);

      // Strip the token from the URL so reloads don't re-attempt the exchange.
      const url = new URL(window.location.href);
      url.searchParams.delete(`${ctx.paramPrefix}builder_token`);
      window.history.replaceState({}, "", url.toString());

      log.info("builder mode active", { flowId: ctx.builderFlowId });
      const { startBuilder } = await import("./builder/overlay");
      await startBuilder(ctx);
    } catch (e) {
      log.error("failed to enter builder mode", e);
    }
    return ctx;
  }

  // Otherwise, run published flows.
  try {
    const { startRunner } = await import("./runner/run");
    await startRunner(ctx);
  } catch (e) {
    log.error("runner failed", e);
  }
  return ctx;
}

/** Tear down active SDK state (mostly for tests). */
export function _reset() {
  active = null;
}
