/**
 * Six-tier element targeting profile recorded at builder time and used by the
 * runner to locate the same element later, with cascading fallback.
 *
 *   1. Custom data attribute (e.g. data-onboarding="save-btn") — gold standard
 *   2. Stable id (e.g. #submit-checkout)
 *   3. Accessibility / semantic (role, aria-label)
 *   4. Inner text content (exact match)
 *   5. Class similarity (Tailwind / BEM, ≥95% recall on recorded classes)
 *   6. Structural DOM path (brittle, used last)
 */
export interface ElementProfile {
  schema: 1;
  tagName: string;
  // Tier 1
  dataAttr?: { name: string; value: string };
  // Tier 2
  id?: string;
  // Tier 3
  role?: string;
  ariaLabel?: string;
  // Tier 4
  text?: string;
  // Tier 5 — filtered list of stable CSS classes (Tailwind utilities, BEM, etc.).
  // Hash-y classes (CSS modules `__abc123`, emotion `css-1a2b3c`) are stripped
  // at record time so they don't dominate the similarity score.
  classes?: string[];
  // Tier 6
  domPath?: string;
}

export type ProfileTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface ProfileMatch {
  element: Element;
  tier: ProfileTier;
}
