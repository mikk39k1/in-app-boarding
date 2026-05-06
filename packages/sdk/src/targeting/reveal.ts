import type { ElementProfile, StepRevealAction } from "@ib/shared";
import { findElement, recordProfile } from "./profile";

const MAX_AUTO_REVEAL_ACTIONS = 4;
const MIN_HEURISTIC_SCORE = 2;

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/(["\\])/g, "\\$1");
}

function clickElement(el: Element) {
  if (el instanceof HTMLElement) {
    el.click();
    return;
  }
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }),
  );
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function tokenize(value: string): string[] {
  return normalizeToken(value)
    .split(/[-_\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function textOf(el: Element): string {
  return (el.textContent ?? "").trim().toLowerCase();
}

function descriptorText(el: Element): string {
  return [
    textOf(el),
    el.getAttribute("id") ?? "",
    el.getAttribute("class") ?? "",
    el.getAttribute("name") ?? "",
    el.getAttribute("data-tab") ?? "",
    el.getAttribute("data-section") ?? "",
    el.getAttribute("data-target") ?? "",
    el.getAttribute("data-controls") ?? "",
    el.getAttribute("data-onboarding") ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  const style = window.getComputedStyle(el);
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (style.opacity === "0") return false;
  if (el.hidden) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  return true;
}

function closestHiddenAncestor(el: Element): Element | null {
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    if (!isElementVisible(current)) return current;
    current = current.parentElement;
  }
  return null;
}

function gatherContextTokens(el: Element): string[] {
  const tokens = new Set<string>();
  let current: Element | null = el;
  let depth = 0;
  while (current && current !== document.documentElement && depth < 4) {
    for (const piece of [
      current.getAttribute("id") ?? "",
      current.getAttribute("class") ?? "",
      current.getAttribute("data-section") ?? "",
      current.getAttribute("data-tab") ?? "",
      current.getAttribute("data-onboarding") ?? "",
      current.getAttribute("aria-label") ?? "",
    ]) {
      for (const token of tokenize(piece)) tokens.add(token);
    }
    const heading = current.querySelector("h1,h2,h3,h4,h5,h6");
    if (heading) {
      for (const token of tokenize(textOf(heading))) tokens.add(token);
    }
    current = current.parentElement;
    depth += 1;
  }
  return Array.from(tokens);
}

function scoreCandidate(candidate: Element, contextTokens: string[]): number {
  const descriptor = descriptorText(candidate);
  let score = 0;
  for (const token of contextTokens) {
    if (descriptor.includes(token)) score += token.length >= 6 ? 2 : 1;
  }
  const cls = candidate.getAttribute("class") ?? "";
  if (/\b(active|selected|open|current)\b/i.test(cls)) score += 2;
  if (candidate.getAttribute("aria-selected") === "true") score += 2;
  if (candidate.getAttribute("aria-expanded") === "true") score += 2;
  return score;
}

function profileKey(action: StepRevealAction): string {
  const p = action.triggerProfile;
  return JSON.stringify({
    tagName: p.tagName,
    dataAttr: p.dataAttr,
    id: p.id,
    role: p.role,
    ariaLabel: p.ariaLabel,
    text: p.text,
    classes: p.classes,
    domPath: p.domPath,
    ensureAttribute: action.ensureAttribute,
    ensureClassAny: action.ensureClassAny,
  });
}

function inferAriaRevealActions(el: Element): StepRevealAction[] {
  const actions: StepRevealAction[] = [];

  const tabPanel = el.closest('[role="tabpanel"][aria-labelledby]');
  if (tabPanel) {
    const tabId = tabPanel.getAttribute("aria-labelledby");
    if (tabId) {
      const tabTrigger = document.getElementById(tabId);
      if (tabTrigger) {
        actions.push({
          triggerProfile: recordProfile(tabTrigger),
          ensureAttribute: { name: "aria-selected", value: "true" },
          source: "aria",
          priority: 100,
        });
      }
    }
  }

  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    const id = current.getAttribute("id");
    if (id) {
      const trigger = document.querySelector(
        `[aria-controls="${cssEscape(id)}"][aria-expanded]`,
      );
      if (trigger) {
        actions.push({
          triggerProfile: recordProfile(trigger),
          ensureAttribute: { name: "aria-expanded", value: "true" },
          source: "aria",
          priority: 95,
        });
      }
    }
    current = current.parentElement;
  }

  return actions;
}

function inferHeuristicRevealActions(el: Element): StepRevealAction[] {
  const actions: StepRevealAction[] = [];
  const hiddenBoundary = closestHiddenAncestor(el) ?? el.closest("section,article,div");
  if (!hiddenBoundary) return actions;

  const contextTokens = gatherContextTokens(hiddenBoundary);
  if (contextTokens.length === 0) return actions;

  const clickableSelector = [
    "button",
    "[role='tab']",
    "[role='button']",
    "a[href]",
    "[data-tab]",
    "[data-section]",
    "[data-target]",
    "[data-controls]",
    "[onclick]",
  ].join(",");

  const searchRoot =
    hiddenBoundary.parentElement ??
    document.body ??
    document.documentElement;
  const candidates = Array.from(searchRoot.querySelectorAll(clickableSelector));
  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, contextTokens),
    }))
    .filter((x) => x.score >= MIN_HEURISTIC_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_AUTO_REVEAL_ACTIONS);

  for (const item of scored) {
    const guardClasses = (item.candidate.getAttribute("class") ?? "")
      .split(/\s+/)
      .map((c) => c.trim())
      .filter((c) => /\b(active|selected|open|current)\b/i.test(c));
    actions.push({
      triggerProfile: recordProfile(item.candidate),
      ensureClassAny: guardClasses.length > 0 ? guardClasses : undefined,
      source: "heuristic",
      priority: 50 + item.score,
    });
  }

  return actions;
}

function dedupeSortActions(actions: StepRevealAction[]): StepRevealAction[] {
  const seen = new Set<string>();
  const unique = actions.filter((action) => {
    const key = profileKey(action);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return unique;
}

export function inferRevealActionsForElement(el: Element): StepRevealAction[] {
  return dedupeSortActions([
    ...inferAriaRevealActions(el),
    ...inferHeuristicRevealActions(el),
  ]);
}

function resolveTargetCandidate(profile: ElementProfile, scope: ParentNode): Element | null {
  const match = findElement(profile, scope);
  if (match) return match.element;

  // Weak fallback for the reveal pipeline: locate by tag/text even if hidden.
  if (profile.text) {
    const candidates = scope.querySelectorAll(profile.tagName);
    for (const c of Array.from(candidates)) {
      if ((c.textContent ?? "").trim() === profile.text) return c;
    }
  }
  return scope.querySelector(profile.tagName);
}

function guardSatisfied(el: Element, action: StepRevealAction): boolean {
  if (action.ensureAttribute) {
    const currentValue = el.getAttribute(action.ensureAttribute.name);
    if (currentValue === action.ensureAttribute.value) return true;
  }
  if (action.ensureClassAny && action.ensureClassAny.length > 0) {
    for (const cls of action.ensureClassAny) {
      if ((el as HTMLElement).classList?.contains(cls)) return true;
    }
  }
  return false;
}

export async function runRevealActions(
  actions: StepRevealAction[] | undefined,
  scope: ParentNode = document,
) {
  if (!actions || actions.length === 0) return;

  for (const action of dedupeSortActions(actions)) {
    const match = findElement(action.triggerProfile, scope);
    if (!match) continue;
    if (guardSatisfied(match.element, action)) continue;
    clickElement(match.element);
    await nextFrame();
    await nextFrame();
  }
}

export async function revealTarget(
  profile: ElementProfile,
  actions: StepRevealAction[] | undefined,
  scope: ParentNode = document,
) {
  // 1) Explicit / recorded actions first.
  await runRevealActions(actions, scope);

  // 2) If target is visible now, stop.
  const initial = resolveTargetCandidate(profile, scope);
  if (initial && isElementVisible(initial)) return;

  // 3) Heuristic auto-reveal for non-ARIA structures.
  if (!initial) return;
  const inferred = inferHeuristicRevealActions(initial);
  await runRevealActions(inferred, scope);
}
