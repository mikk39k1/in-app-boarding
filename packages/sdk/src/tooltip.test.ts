import { beforeEach, describe, expect, it } from "vitest";
import { getShadowRoot } from "./shadow-host";
import { showTooltip } from "./tooltip";

beforeEach(() => {
  document.documentElement.innerHTML = "<head></head><body></body>";
});

describe("showTooltip dim background", () => {
  it("renders spotlight when dimBackground is true", () => {
    const target = document.createElement("button");
    target.textContent = "Target";
    document.body.appendChild(target);

    const handle = showTooltip(target, {
      title: "Step",
      body: "Body",
      dimBackground: true,
    });

    const root = getShadowRoot();
    expect(root.querySelector(".spotlight")).toBeTruthy();
    handle.destroy();
  });

  it("removes spotlight on destroy", () => {
    const target = document.createElement("button");
    document.body.appendChild(target);

    const handle = showTooltip(target, {
      title: "Step",
      body: "Body",
      dimBackground: true,
    });
    handle.destroy();

    const root = getShadowRoot();
    expect(root.querySelector(".spotlight")).toBeNull();
  });
});
