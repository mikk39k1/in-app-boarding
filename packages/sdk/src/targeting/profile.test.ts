import { describe, it, expect, beforeEach } from "vitest";
import { recordProfile, findElement } from "./profile";

beforeEach(() => {
  document.documentElement.innerHTML = `<head></head><body></body>`;
});

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe("recordProfile", () => {
  it("captures the data-onboarding attribute (tier 1)", () => {
    setBody(`<button data-onboarding="save">Save</button>`);
    const el = document.querySelector("button")!;
    const p = recordProfile(el);
    expect(p.tagName).toBe("button");
    expect(p.dataAttr).toEqual({ name: "data-onboarding", value: "save" });
  });

  it("falls back to data-testid when no data-onboarding present", () => {
    setBody(`<button data-testid="save-btn">Save</button>`);
    const el = document.querySelector("button")!;
    const p = recordProfile(el);
    expect(p.dataAttr).toEqual({ name: "data-testid", value: "save-btn" });
  });

  it("captures stable id but not auto-generated ones", () => {
    setBody(`
      <button id="submit-checkout">Go</button>
      <button id="abc-9d2f4a8b">Hashed</button>
    `);
    const stable = document.getElementById("submit-checkout")!;
    const auto = document.getElementById("abc-9d2f4a8b")!;
    expect(recordProfile(stable).id).toBe("submit-checkout");
    expect(recordProfile(auto).id).toBeUndefined();
  });

  it("captures aria-label and role", () => {
    setBody(`<button role="menu" aria-label="Open menu">…</button>`);
    const p = recordProfile(document.querySelector("button")!);
    expect(p.role).toBe("menu");
    expect(p.ariaLabel).toBe("Open menu");
  });

  it("captures inner text", () => {
    setBody(`<button>Save profile</button>`);
    const p = recordProfile(document.querySelector("button")!);
    expect(p.text).toBe("Save profile");
  });

  it("computes a structural DOM path", () => {
    setBody(`<div><main><form><button>1</button><button>2</button></form></main></div>`);
    const el = document.querySelectorAll("button")[1];
    const p = recordProfile(el);
    expect(p.domPath).toContain("button:nth-of-type(2)");
  });
});

describe("findElement (cascading fallback)", () => {
  it("matches on tier 1 when data attr present", () => {
    setBody(`<button data-onboarding="save">Save</button>`);
    const el = document.querySelector("button")!;
    const p = recordProfile(el);
    const m = findElement(p);
    expect(m?.tier).toBe(1);
    expect(m?.element).toBe(el);
  });

  it("falls through to tier 2 when data attr is gone", () => {
    setBody(`<button id="save-btn">Save</button>`);
    const el = document.querySelector("button")!;
    const p = recordProfile(el);
    expect(findElement(p)?.tier).toBe(2);
  });

  it("falls through to tier 3 when only aria-label remains", () => {
    setBody(`<button aria-label="Save">…</button>`);
    const p = recordProfile(document.querySelector("button")!);
    // Re-render slightly differently to drop tier 1/2.
    setBody(`<span><button aria-label="Save">…</button></span>`);
    const m = findElement(p);
    expect(m?.tier).toBe(3);
  });

  it("falls through to tier 4 when only text matches", () => {
    setBody(`<button>Continue</button>`);
    const p = recordProfile(document.querySelector("button")!);
    setBody(`<div><span></span><button>Continue</button></div>`);
    const m = findElement(p);
    expect(m?.tier).toBeLessThanOrEqual(4);
    expect((m?.element as HTMLElement).textContent).toBe("Continue");
  });

  it("returns null when nothing matches", () => {
    setBody(`<button data-onboarding="save">Save</button>`);
    const p = recordProfile(document.querySelector("button")!);
    setBody(`<p>No buttons here.</p>`);
    expect(findElement(p)).toBeNull();
  });

  it("data-onboarding wins even if id changed", () => {
    setBody(`<button data-onboarding="save" id="save-1">Save</button>`);
    const p = recordProfile(document.querySelector("button")!);
    setBody(`<button data-onboarding="save" id="save-2">Save</button>`);
    const m = findElement(p);
    expect(m?.tier).toBe(1);
    expect((m?.element as HTMLElement).id).toBe("save-2");
  });
});
