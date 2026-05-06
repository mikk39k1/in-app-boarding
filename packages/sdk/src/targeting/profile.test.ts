import { describe, it, expect, beforeEach } from "vitest";
import { recordProfile, findElement, filterStableClasses } from "./profile";

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

  it("captures stable Tailwind / BEM classes (tier 5)", () => {
    setBody(
      `<button class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save</button>`,
    );
    const p = recordProfile(document.querySelector("button")!);
    expect(p.classes).toEqual(
      expect.arrayContaining([
        "inline-flex",
        "items-center",
        "px-4",
        "py-2",
        "bg-blue-600",
        "hover:bg-blue-700",
        "text-white",
        "rounded-md",
      ]),
    );
  });

  it("strips emotion / CSS-modules hash classes from tier 5", () => {
    setBody(
      `<button class="flex items-center css-1j3kfly Button_root__abc123 sc-bdVaJa _3kbF9X">x</button>`,
    );
    const p = recordProfile(document.querySelector("button")!);
    expect(p.classes).toContain("flex");
    expect(p.classes).toContain("items-center");
    expect(p.classes).not.toContain("css-1j3kfly");
    expect(p.classes).not.toContain("Button_root__abc123");
    expect(p.classes).not.toContain("sc-bdVaJa");
    expect(p.classes).not.toContain("_3kbF9X");
  });

  it("omits the classes field when there are too few stable classes", () => {
    setBody(`<button class="css-1j3kfly">x</button>`);
    const p = recordProfile(document.querySelector("button")!);
    expect(p.classes).toBeUndefined();
  });
});

describe("filterStableClasses", () => {
  it("dedupes and trims while preserving order", () => {
    expect(filterStableClasses(["flex", " px-4 ", "flex", "py-2"])).toEqual([
      "flex",
      "px-4",
      "py-2",
    ]);
  });

  it("keeps Tailwind variants like md:px-4 and hover:bg-blue-500", () => {
    expect(
      filterStableClasses([
        "md:px-4",
        "hover:bg-blue-500",
        "lg:hover:text-white",
      ]),
    ).toEqual(["md:px-4", "hover:bg-blue-500", "lg:hover:text-white"]);
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

  it("falls through to tier 5 (class similarity) when only the class set survives", () => {
    setBody(
      `<button class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">Original</button>`,
    );
    const p = recordProfile(document.querySelector("button")!);

    setBody(
      `<button class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md mt-2">Renamed</button>`,
    );
    const m = findElement(p);
    expect(m?.tier).toBe(5);
    expect((m?.element as HTMLElement).textContent).toBe("Renamed");
  });

  it("tier 5 picks the most similar candidate among siblings", () => {
    setBody(
      `<button class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>`,
    );
    const p = recordProfile(document.querySelector("button")!);

    setBody(`
      <div>
        <button class="inline-flex items-center px-2 py-1 bg-gray-200 text-black rounded-sm">Cancel</button>
        <button class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">Confirm</button>
      </div>
    `);
    const m = findElement(p);
    expect(m?.tier).toBe(5);
    expect((m?.element as HTMLElement).textContent).toBe("Confirm");
  });

  it("tier 5 rejects matches below the 95% threshold", () => {
    setBody(
      `<button class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none">Original</button>`,
    );
    const p = recordProfile(document.querySelector("button")!);

    // Only 4 of 9 recorded classes survive → ~44% recall, well below 95%.
    // Text differs (kills tier 4) and DOM is restructured so the path
    // differs (kills tier 6), leaving tier 5 as the only candidate.
    setBody(
      `<header><nav><div><span><button class="flex items-center text-white rounded-md">Renamed</button></span></div></nav></header>`,
    );
    expect(findElement(p)).toBeNull();
  });

  it("text equality (tier 4) still wins over class similarity (tier 5)", () => {
    setBody(`<button class="flex items-center px-4 py-2">Continue</button>`);
    const p = recordProfile(document.querySelector("button")!);
    setBody(
      `<div><button class="flex items-center px-4 py-2 mt-1">Continue</button></div>`,
    );
    const m = findElement(p);
    expect(m?.tier).toBe(4);
  });
});
