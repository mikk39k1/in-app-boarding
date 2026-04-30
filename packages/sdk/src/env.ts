export type ApiKeyEnv = "DEV" | "PROD";

export function environmentOfKey(key: string): ApiKeyEnv | null {
  if (key.startsWith("dev_")) return "DEV";
  if (key.startsWith("prod_")) return "PROD";
  return null;
}

export function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

export interface EnvCheckResult {
  ok: boolean;
  level: "info" | "warn" | "error";
  message: string;
  debug: boolean;
}

/**
 * Mirrors the ADR rules:
 *   - localhost + prod_  → loud error
 *   - localhost + dev_   → enable debug mode (verbose logging)
 *   - non-local + dev_   → warning
 *   - non-local + prod_  → ok
 */
export function checkEnvironment(apiKey: string): EnvCheckResult {
  const env = environmentOfKey(apiKey);
  const local = isLocalhost();

  if (!env) {
    return {
      ok: false,
      level: "error",
      message:
        '[InAppBoarding] API key must start with "dev_" or "prod_". Refusing to initialise.',
      debug: false,
    };
  }

  if (local && env === "PROD") {
    return {
      ok: false,
      level: "error",
      message:
        "[InAppBoarding] A prod_ key was used on localhost. This would pollute production data — refusing to initialise. Use a dev_ key for local development.",
      debug: false,
    };
  }

  if (local && env === "DEV") {
    return {
      ok: true,
      level: "info",
      message: "[InAppBoarding] dev mode active on localhost — debug logging enabled.",
      debug: true,
    };
  }

  if (!local && env === "DEV") {
    return {
      ok: true,
      level: "warn",
      message:
        "[InAppBoarding] dev_ key used outside localhost — analytics and flows are isolated to the dev environment.",
      debug: false,
    };
  }

  return {
    ok: true,
    level: "info",
    message: "[InAppBoarding] prod mode active.",
    debug: false,
  };
}
