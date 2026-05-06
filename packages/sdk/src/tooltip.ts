import {
  computePosition,
  autoUpdate,
  flip,
  shift,
  offset,
  arrow,
  type Placement as FuiPlacement,
} from "@floating-ui/dom";
import type { Placement } from "@ib/shared";
import { getShadowRoot } from "./shadow-host";

export interface TooltipOptions {
  title: string;
  body: string;
  dimBackground?: boolean;
  placement?: Placement;
  primaryLabel?: string;
  secondaryLabel?: string;
  meta?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose?: () => void;
}

export interface TooltipHandle {
  destroy: () => void;
  update: (next: Partial<TooltipOptions>) => void;
  element: HTMLDivElement;
}

function asFuiPlacement(p: Placement | undefined): FuiPlacement | undefined {
  if (!p || p === "auto") return undefined;
  return p as FuiPlacement;
}

export function showTooltip(
  target: Element,
  options: TooltipOptions,
): TooltipHandle {
  const root = getShadowRoot();

  const spotlight = document.createElement("div");
  spotlight.className = "spotlight";

  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  const arrowEl = document.createElement("div");
  arrowEl.className = "arrow";

  function render(opts: TooltipOptions) {
    tooltip.innerHTML = "";
    const titleEl = document.createElement("h4");
    titleEl.textContent = opts.title;
    const bodyEl = document.createElement("p");
    bodyEl.textContent = opts.body;
    const actions = document.createElement("div");
    actions.className = "actions";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = opts.meta ?? "";

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "6px";
    if (opts.onSecondary) {
      const sec = document.createElement("button");
      sec.className = "btn";
      sec.textContent = opts.secondaryLabel ?? "Back";
      sec.addEventListener("click", () => opts.onSecondary?.());
      right.appendChild(sec);
    }
    if (opts.onPrimary) {
      const prim = document.createElement("button");
      prim.className = "btn primary";
      prim.textContent = opts.primaryLabel ?? "Next";
      prim.addEventListener("click", () => opts.onPrimary?.());
      right.appendChild(prim);
    }
    if (opts.onClose) {
      const close = document.createElement("button");
      close.className = "btn";
      close.textContent = "Close";
      close.addEventListener("click", () => opts.onClose?.());
      right.appendChild(close);
    }

    actions.appendChild(meta);
    actions.appendChild(right);

    tooltip.appendChild(titleEl);
    tooltip.appendChild(bodyEl);
    tooltip.appendChild(actions);
    tooltip.appendChild(arrowEl);
  }

  let current = options;
  render(current);
  if (current.dimBackground) {
    root.appendChild(spotlight);
  }
  root.appendChild(tooltip);

  const cleanup = autoUpdate(target, tooltip, () => {
    computePosition(target, tooltip, {
      placement: asFuiPlacement(current.placement) ?? "bottom",
      middleware: [
        offset(10),
        flip(),
        shift({ padding: 8 }),
        arrow({ element: arrowEl, padding: 6 }),
      ],
    }).then(({ x, y, placement, middlewareData }) => {
      Object.assign(tooltip.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
      const arrowData = middlewareData.arrow;
      if (arrowData) {
        const side = placement.split("-")[0] as
          | "top"
          | "bottom"
          | "left"
          | "right";
        const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" }[side];
        Object.assign(arrowEl.style, {
          left: arrowData.x != null ? `${arrowData.x}px` : "",
          top: arrowData.y != null ? `${arrowData.y}px` : "",
          right: "",
          bottom: "",
          [opposite]: "-5px",
        });
      }
    });

    if (current.dimBackground) {
      const rect = target.getBoundingClientRect();
      Object.assign(spotlight.style, {
        left: `${rect.left + window.scrollX - 8}px`,
        top: `${rect.top + window.scrollY - 8}px`,
        width: `${rect.width + 16}px`,
        height: `${rect.height + 16}px`,
      });
    }
  });

  return {
    element: tooltip,
    update(next) {
      const wasDimmed = Boolean(current.dimBackground);
      current = { ...current, ...next };
      render(current);
      const isDimmed = Boolean(current.dimBackground);
      if (!wasDimmed && isDimmed) {
        root.appendChild(spotlight);
      } else if (wasDimmed && !isDimmed) {
        spotlight.remove();
      }
    },
    destroy() {
      cleanup();
      tooltip.remove();
      spotlight.remove();
    },
  };
}

export interface HighlightHandle {
  destroy: () => void;
  update: (next: Element) => void;
}

export function highlight(target: Element): HighlightHandle {
  const root = getShadowRoot();
  const box = document.createElement("div");
  box.className = "highlight";
  root.appendChild(box);

  let current = target;
  const cleanup = autoUpdate(current, box, () => position());

  function position() {
    const rect = current.getBoundingClientRect();
    Object.assign(box.style, {
      left: `${rect.left + window.scrollX - 4}px`,
      top: `${rect.top + window.scrollY - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
    });
  }

  return {
    update(next: Element) {
      current = next;
      position();
    },
    destroy() {
      cleanup();
      box.remove();
    },
  };
}
