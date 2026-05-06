import { beforeEach, describe, expect, it } from "vitest";
import {
  inferRevealActionsForElement,
  revealTarget,
  runRevealActions,
} from "./reveal";

beforeEach(() => {
  document.documentElement.innerHTML = `<head></head><body></body>`;
});

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe("inferRevealActionsForElement", () => {
  it("infers a tab trigger from aria-labelledby tabpanel wiring", () => {
    setBody(`
      <nav role="tablist">
        <button role="tab" id="tab-overview" aria-controls="panel-overview" aria-selected="false">Overview</button>
        <button role="tab" id="tab-settings" aria-controls="panel-settings" aria-selected="true">Settings</button>
      </nav>
      <section role="tabpanel" id="panel-settings" aria-labelledby="tab-settings">
        <label>Name <input id="workspace-name" /></label>
      </section>
    `);

    const input = document.getElementById("workspace-name")!;
    const actions = inferRevealActionsForElement(input);
    const ariaAction = actions.find((a) => a.source === "aria");
    expect(ariaAction).toBeTruthy();
    expect(ariaAction?.ensureAttribute).toEqual({
      name: "aria-selected",
      value: "true",
    });
    expect(ariaAction?.triggerProfile.id).toBe("tab-settings");
  });

  it("infers non-ARIA trigger from id/class/data token overlap", () => {
    setBody(`
      <div class="tabs">
        <button class="tab-btn active" data-tab="overview" id="tab-overview">Overview</button>
        <button class="tab-btn" data-tab="settings" id="tab-settings">Settings</button>
      </div>
      <section id="overview-panel" class="panel active">Overview body</section>
      <section id="settings-panel" class="panel active">
        <input id="workspace-name" />
      </section>
    `);

    const input = document.getElementById("workspace-name")!;
    const actions = inferRevealActionsForElement(input);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((a) => a.triggerProfile.id === "tab-settings")).toBe(true);
    expect(actions.some((a) => a.source === "heuristic")).toBe(true);
  });
});

describe("runRevealActions", () => {
  it("clicks trigger when guard attribute is not satisfied", async () => {
    setBody(`
      <button id="tab-settings" role="tab" aria-selected="false">Settings</button>
    `);
    const trigger = document.getElementById("tab-settings")!;
    let clicks = 0;
    trigger.addEventListener("click", () => {
      clicks += 1;
      trigger.setAttribute("aria-selected", "true");
    });

    await runRevealActions([
      {
        triggerProfile: { schema: 1, tagName: "button", id: "tab-settings" },
        ensureAttribute: { name: "aria-selected", value: "true" },
      },
    ]);

    expect(clicks).toBe(1);
    expect(trigger.getAttribute("aria-selected")).toBe("true");
  });

  it("does not click trigger when guard attribute already matches", async () => {
    setBody(`
      <button id="tab-settings" role="tab" aria-selected="true">Settings</button>
    `);
    const trigger = document.getElementById("tab-settings")!;
    let clicks = 0;
    trigger.addEventListener("click", () => {
      clicks += 1;
    });

    await runRevealActions([
      {
        triggerProfile: { schema: 1, tagName: "button", id: "tab-settings" },
        ensureAttribute: { name: "aria-selected", value: "true" },
      },
    ]);

    expect(clicks).toBe(0);
  });

  it("does not click trigger when guard class already matches", async () => {
    setBody(`
      <button id="tab-settings" class="tab active">Settings</button>
    `);
    const trigger = document.getElementById("tab-settings")!;
    let clicks = 0;
    trigger.addEventListener("click", () => {
      clicks += 1;
    });

    await runRevealActions([
      {
        triggerProfile: { schema: 1, tagName: "button", id: "tab-settings" },
        ensureClassAny: ["active"],
      },
    ]);

    expect(clicks).toBe(0);
  });
});

describe("revealTarget", () => {
  it("uses explicit reveal action to make hidden target visible", async () => {
    setBody(`
      <div class="tabs">
        <button id="tab-overview" class="tab active">Overview</button>
        <button id="tab-settings" class="tab">Settings</button>
      </div>
      <section id="overview-panel">Overview</section>
      <section id="settings-panel" style="display:none">
        <input id="workspace-name" />
      </section>
    `);

    const tab = document.getElementById("tab-settings")!;
    const settingsPanel = document.getElementById("settings-panel")!;
    tab.addEventListener("click", () => {
      settingsPanel.setAttribute("style", "display:block");
      tab.classList.add("active");
    });

    await revealTarget(
      { schema: 1, tagName: "input", id: "workspace-name" },
      [
        {
          triggerProfile: { schema: 1, tagName: "button", id: "tab-settings" },
          ensureClassAny: ["active"],
          source: "recorded",
          priority: 200,
        },
      ],
    );

    expect(settingsPanel.getAttribute("style")).toContain("display:block");
  });
});
