import type { FlowDTO, FlowStepDTO } from "@ib/shared";
import type { SdkContext } from "../init";
import { log } from "../log";
import { getShadowRoot } from "../shadow-host";
import { recordProfile, findElement } from "../targeting/profile";
import { highlight } from "../tooltip";

interface BuilderState {
  flow: FlowDTO;
  steps: FlowStepDTO[];
  dirty: boolean;
  picking: boolean;
}

export async function startBuilder(ctx: SdkContext) {
  if (!ctx.builderJwt || !ctx.builderFlowId) {
    log.error("builder mode requires JWT and flowId");
    return;
  }

  const flow = await ctx.client.getFlow(ctx.builderFlowId);
  const state: BuilderState = {
    flow,
    steps: [...flow.steps],
    dirty: false,
    picking: false,
  };

  renderPanel(ctx, state);
}

function renderPanel(ctx: SdkContext, state: BuilderState) {
  const root = getShadowRoot();
  const old = root.querySelector(".builder-panel");
  if (old) old.remove();

  const panel = document.createElement("div");
  panel.className = "builder-panel";

  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = state.flow.name;
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = `${state.flow.environment} · builder`;
  header.append(title, pill);

  const body = document.createElement("div");
  body.className = "body";

  const intro = document.createElement("div");
  intro.className = "status";
  intro.textContent =
    state.steps.length === 0
      ? "Click Add step, then click any element on the page to anchor a tooltip."
      : `${state.steps.length} step${state.steps.length === 1 ? "" : "s"}.`;
  body.appendChild(intro);

  state.steps
    .sort((a, b) => a.order - b.order)
    .forEach((step, idx) => {
      body.appendChild(renderStep(step, idx, state, ctx));
    });

  const addBtn = document.createElement("button");
  addBtn.className = "btn primary";
  addBtn.textContent = state.picking
    ? "Cancel pick…"
    : "+ Add step (pick element)";
  addBtn.addEventListener("click", () => {
    if (state.picking) {
      stopPicking();
      state.picking = false;
      renderPanel(ctx, state);
      return;
    }
    state.picking = true;
    renderPanel(ctx, state);
    startPicking((el) => {
      state.picking = false;
      const profile = recordProfile(el);
      const newStep: FlowStepDTO = {
        id: `tmp-${Date.now()}`,
        flowId: state.flow.id,
        order: state.steps.length,
        title: `Step ${state.steps.length + 1}`,
        body: "",
        targetProfile: profile,
        placement: "auto",
        pageUrlPattern: null,
      };
      state.steps.push(newStep);
      state.dirty = true;
      renderPanel(ctx, state);
    });
  });
  body.appendChild(addBtn);

  const footer = document.createElement("footer");
  const status = document.createElement("span");
  status.className = "status";
  status.textContent = state.dirty ? "Unsaved changes" : "All saved";
  footer.appendChild(status);

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn primary";
  saveBtn.textContent = "Save";
  saveBtn.disabled = !state.dirty;
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      const updated = await ctx.client.updateFlow(state.flow.id, {
        steps: state.steps.map((s, i) => ({
          order: i,
          title: s.title,
          body: s.body,
          targetProfile: s.targetProfile,
          placement: s.placement,
          pageUrlPattern: s.pageUrlPattern,
        })),
      });
      state.flow = updated;
      state.steps = [...updated.steps];
      state.dirty = false;
      renderPanel(ctx, state);
    } catch (e) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Retry save";
      log.error("save failed", e);
    }
  });
  footer.appendChild(saveBtn);

  panel.append(header, body, footer);
  root.appendChild(panel);
}

function renderStep(
  step: FlowStepDTO,
  idx: number,
  state: BuilderState,
  ctx: SdkContext,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "step";

  const row = document.createElement("div");
  row.className = "row";
  const number = document.createElement("strong");
  number.textContent = `#${idx + 1}`;
  const remove = document.createElement("button");
  remove.className = "btn";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    state.steps = state.steps.filter((s) => s.id !== step.id);
    state.dirty = true;
    renderPanel(ctx, state);
  });
  row.append(number, remove);
  wrap.appendChild(row);

  const titleInput = document.createElement("input");
  titleInput.value = step.title;
  titleInput.placeholder = "Title";
  titleInput.addEventListener("input", () => {
    step.title = titleInput.value;
    state.dirty = true;
  });
  wrap.appendChild(titleInput);

  const bodyTa = document.createElement("textarea");
  bodyTa.value = step.body;
  bodyTa.placeholder = "Body";
  bodyTa.addEventListener("input", () => {
    step.body = bodyTa.value;
    state.dirty = true;
  });
  wrap.appendChild(bodyTa);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = describeProfile(step.targetProfile);
  wrap.appendChild(meta);

  // Highlight on hover.
  wrap.addEventListener("mouseenter", () => {
    const m = findElement(step.targetProfile);
    if (m) {
      const h = highlight(m.element);
      wrap.dataset.highlightId = String(Date.now());
      const id = wrap.dataset.highlightId;
      const cleanup = () => {
        if (wrap.dataset.highlightId === id) {
          h.destroy();
          wrap.removeEventListener("mouseleave", cleanup);
        }
      };
      wrap.addEventListener("mouseleave", cleanup);
    }
  });

  return wrap;
}

function describeProfile(profile: FlowStepDTO["targetProfile"]): string {
  if (profile.dataAttr)
    return `[${profile.dataAttr.name}="${profile.dataAttr.value}"]`;
  if (profile.id) return `#${profile.id}`;
  if (profile.ariaLabel) return `aria-label="${profile.ariaLabel}"`;
  if (profile.text) return `"${profile.text}"`;
  return profile.domPath ?? profile.tagName;
}

// ---- element picker --------------------------------------------------

type PickCallback = (el: Element) => void;
let activePicker: { stop: () => void } | null = null;

function stopPicking() {
  activePicker?.stop();
  activePicker = null;
}

function startPicking(onPick: PickCallback) {
  stopPicking();
  const root = getShadowRoot();

  const cursor = document.createElement("div");
  cursor.className = "highlight";
  cursor.style.pointerEvents = "none";
  root.appendChild(cursor);

  let lastTarget: Element | null = null;

  const move = (e: MouseEvent) => {
    const el = elementFromHostPoint(e.clientX, e.clientY);
    if (!el || el === lastTarget) return;
    lastTarget = el;
    const rect = el.getBoundingClientRect();
    Object.assign(cursor.style, {
      left: `${rect.left + window.scrollX - 4}px`,
      top: `${rect.top + window.scrollY - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
    });
  };

  const click = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elementFromHostPoint(e.clientX, e.clientY);
    if (el) {
      stop();
      onPick(el);
    }
  };

  const key = (e: KeyboardEvent) => {
    if (e.key === "Escape") stop();
  };

  function stop() {
    cursor.remove();
    document.removeEventListener("mousemove", move, true);
    document.removeEventListener("click", click, true);
    document.removeEventListener("keydown", key, true);
    activePicker = null;
  }

  document.addEventListener("mousemove", move, true);
  document.addEventListener("click", click, true);
  document.addEventListener("keydown", key, true);
  activePicker = { stop };
}

/**
 * Like document.elementFromPoint but skips our own shadow host so picking
 * doesn't snap onto the builder UI.
 */
function elementFromHostPoint(x: number, y: number): Element | null {
  const root = getShadowRoot();
  const host = root.host;
  // Temporarily disable pointer events on the host so we can see through.
  const prev = (host as HTMLElement).style.pointerEvents;
  (host as HTMLElement).style.pointerEvents = "none";
  const el = document.elementFromPoint(x, y);
  (host as HTMLElement).style.pointerEvents = prev;
  return el && el !== document.body && el !== document.documentElement
    ? el
    : null;
}
