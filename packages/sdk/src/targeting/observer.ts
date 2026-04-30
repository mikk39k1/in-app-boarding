import type { ElementProfile } from "@ib/shared";
import { findElement } from "./profile";

export interface WaitOptions {
  timeoutMs?: number;
  scope?: ParentNode;
}

/**
 * Resolve the target element now, or wait via MutationObserver until it
 * appears. SPAs often render targets after route changes, async data loads, or
 * dropdown opens — this is the bridge.
 */
export function waitForElement(
  profile: ElementProfile,
  opts: WaitOptions = {},
): Promise<Element | null> {
  const { timeoutMs = 10_000, scope = document } = opts;

  const immediate = findElement(profile, scope);
  if (immediate) return Promise.resolve(immediate.element);

  return new Promise<Element | null>((resolve) => {
    let done = false;
    const finish = (el: Element | null) => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timeoutId);
      resolve(el);
    };

    const observer = new MutationObserver(() => {
      const m = findElement(profile, scope);
      if (m) finish(m.element);
    });

    observer.observe(scope === document ? document.documentElement : (scope as Node), {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "id",
        "role",
        "aria-label",
        "data-onboarding",
        "data-ib",
        "data-testid",
        "data-cy",
        "data-test-id",
      ],
    });

    const timeoutId = setTimeout(() => finish(null), timeoutMs);
  });
}
