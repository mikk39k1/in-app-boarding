import { log } from "./log";

const HOST_TAG = "ib-root";

const SHADOW_CSS = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  color: #18181b;
  --ib-bg: #ffffff;
  --ib-border: #e4e4e7;
  --ib-fg: #18181b;
  --ib-muted: #71717a;
  --ib-accent: #2563eb;
  --ib-accent-fg: #ffffff;
  --ib-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}
* { box-sizing: border-box; }
button { cursor: pointer; font-family: inherit; }

.tooltip {
  background: var(--ib-bg);
  border: 1px solid var(--ib-border);
  border-radius: 10px;
  padding: 14px 16px;
  width: 280px;
  box-shadow: var(--ib-shadow);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2147483647;
}
.tooltip h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}
.tooltip p {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--ib-muted);
  white-space: pre-wrap;
}
.tooltip .actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  gap: 8px;
}
.tooltip .meta {
  font-size: 11px;
  color: var(--ib-muted);
}
.btn {
  border: 1px solid var(--ib-border);
  background: var(--ib-bg);
  color: var(--ib-fg);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
}
.btn.primary {
  background: var(--ib-accent);
  color: var(--ib-accent-fg);
  border-color: var(--ib-accent);
}
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--ib-bg);
  border: 1px solid var(--ib-border);
  transform: rotate(45deg);
}

.highlight {
  position: absolute;
  border: 2px dashed var(--ib-accent);
  border-radius: 4px;
  pointer-events: none;
  z-index: 2147483646;
  transition: top 80ms ease, left 80ms ease, width 80ms ease, height 80ms ease;
}

.builder-panel {
  position: fixed;
  right: 16px;
  top: 16px;
  width: 320px;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--ib-bg);
  border: 1px solid var(--ib-border);
  border-radius: 12px;
  box-shadow: var(--ib-shadow);
  overflow: hidden;
  z-index: 2147483647;
  font-size: 13px;
}
.builder-panel header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--ib-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.builder-panel header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.builder-panel header .pill {
  font-size: 10px;
  background: var(--ib-accent);
  color: var(--ib-accent-fg);
  border-radius: 999px;
  padding: 2px 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.builder-panel .body {
  padding: 12px 14px;
  overflow: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.builder-panel .step {
  border: 1px solid var(--ib-border);
  border-radius: 8px;
  padding: 10px;
}
.builder-panel .step .row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.builder-panel .step input,
.builder-panel .step textarea {
  width: 100%;
  font: inherit;
  border: 1px solid var(--ib-border);
  border-radius: 6px;
  padding: 6px 8px;
  background: var(--ib-bg);
  color: var(--ib-fg);
}
.builder-panel .step textarea { min-height: 56px; resize: vertical; }
.builder-panel .step .meta {
  font-size: 10px;
  color: var(--ib-muted);
  margin-top: 4px;
  word-break: break-all;
}
.builder-panel footer {
  padding: 10px 14px;
  border-top: 1px solid var(--ib-border);
  display: flex;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
}
.builder-panel .status {
  font-size: 11px;
  color: var(--ib-muted);
}
`;

let cachedRoot: ShadowRoot | null = null;

/**
 * Returns a stable open Shadow DOM hosted in a single <ib-root> element. We
 * use Shadow DOM to isolate our tooltip / builder UI from the host site's
 * unpredictable global CSS (and vice versa).
 */
export function getShadowRoot(): ShadowRoot {
  if (cachedRoot) return cachedRoot;

  let host = document.querySelector(HOST_TAG) as HTMLElement | null;
  if (!host) {
    host = document.createElement(HOST_TAG);
    host.style.position = "static";
    host.style.zIndex = "2147483647";
    document.documentElement.appendChild(host);
  }

  const root = host.attachShadow({ mode: "open" });

  const sheet = new CSSStyleSheet();
  try {
    sheet.replaceSync(SHADOW_CSS);
    root.adoptedStyleSheets = [sheet];
  } catch {
    // Fallback for older browsers without Constructable Stylesheets.
    const style = document.createElement("style");
    style.textContent = SHADOW_CSS;
    root.appendChild(style);
  }

  cachedRoot = root;
  log.debug("shadow root created");
  return root;
}

export function shadowAppend(el: Node) {
  getShadowRoot().appendChild(el);
}
