import type { FlowDTO, FlowStepDTO } from "@ib/shared";
import type { SdkContext } from "../init";
import { log } from "../log";
import { showTooltip, type TooltipHandle } from "../tooltip";
import { waitForElement } from "../targeting/observer";

const STORAGE_PREFIX = "ib:flow:";

function flowDoneKey(flowId: string) {
  return `${STORAGE_PREFIX}${flowId}:done`;
}

function isFlowComplete(flowId: string): boolean {
  try {
    return window.localStorage.getItem(flowDoneKey(flowId)) === "1";
  } catch {
    return false;
  }
}

function markFlowComplete(flowId: string) {
  try {
    window.localStorage.setItem(flowDoneKey(flowId), "1");
  } catch {
    // localStorage may be disabled — just no-op.
  }
}

function urlMatches(pattern: string | null): boolean {
  if (!pattern) return true;
  const path = window.location.pathname;
  if (pattern.startsWith("/^") && pattern.endsWith("$/")) {
    try {
      return new RegExp(pattern.slice(1, -1)).test(path);
    } catch {
      return false;
    }
  }
  // glob-ish: /foo/* matches /foo/anything
  const regex = new RegExp(
    "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
  );
  return regex.test(path);
}

export async function startRunner(ctx: SdkContext) {
  let flows: FlowDTO[];
  try {
    const res = await ctx.client.listFlows();
    flows = res.flows;
  } catch (e) {
    log.error("failed to list flows", e);
    return;
  }

  const eligible = flows.filter(
    (f) => f.isPublished && !isFlowComplete(f.id) && f.steps.length > 0,
  );
  if (eligible.length === 0) {
    log.debug("no eligible flows for this user/page");
    return;
  }

  const flow = eligible[0];
  log.debug("running flow", flow.name, flow.id);
  await runFlow(flow);
}

async function runFlow(flow: FlowDTO) {
  let index = 0;
  let currentTooltip: TooltipHandle | null = null;

  const steps = [...flow.steps].sort((a, b) => a.order - b.order);

  async function show(step: FlowStepDTO) {
    if (!urlMatches(step.pageUrlPattern)) {
      log.debug("step skipped — URL does not match", step);
      next();
      return;
    }

    const target = await waitForElement(step.targetProfile, {
      timeoutMs: 10_000,
    });
    if (!target) {
      log.warn("could not anchor step, skipping", step.title);
      next();
      return;
    }

    currentTooltip?.destroy();
    const isLast = index === steps.length - 1;
    currentTooltip = showTooltip(target, {
      title: step.title,
      body: step.body,
      placement: step.placement,
      meta: `${index + 1} / ${steps.length}`,
      primaryLabel: isLast ? "Done" : "Next",
      secondaryLabel: index > 0 ? "Back" : undefined,
      onPrimary: () => {
        if (isLast) {
          finish();
        } else {
          next();
        }
      },
      onSecondary: index > 0 ? () => prev() : undefined,
      onClose: () => finish(),
    });
  }

  function next() {
    if (index >= steps.length - 1) {
      finish();
      return;
    }
    index += 1;
    void show(steps[index]);
  }

  function prev() {
    if (index === 0) return;
    index -= 1;
    void show(steps[index]);
  }

  function finish() {
    currentTooltip?.destroy();
    currentTooltip = null;
    markFlowComplete(flow.id);
  }

  await show(steps[0]);
}
