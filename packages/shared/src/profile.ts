/**
 * Five-tier element targeting profile recorded at builder time and used by the
 * runner to locate the same element later, with cascading fallback.
 *
 *   1. Custom data attribute (e.g. data-onboarding="save-btn") — gold standard
 *   2. Stable id (e.g. #submit-checkout)
 *   3. Accessibility / semantic (role, aria-label)
 *   4. Inner text content
 *   5. Structural DOM path (brittle, used last)
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
  // Tier 5
  domPath?: string;
}

export type ProfileTier = 1 | 2 | 3 | 4 | 5;

export interface ProfileMatch {
  element: Element;
  tier: ProfileTier;
}
