# @ib/sdk

Browser SDK for the in-app onboarding platform. Loaded by client applications to render onboarding flows and (when launched from the dashboard) the visual builder overlay.

## Public API

```ts
import { init, getContext } from "@ib/sdk";

await init({
  apiKey: "dev_xxx",                 // dev_ or prod_ prefixed
  apiUrl: "http://localhost:3000",   // dashboard backend (default: window.location.origin)
});
```

The SDK auto-detects builder mode via the URL param `?ib_builder_token=…` (configurable via `paramPrefix`). When detected it exchanges the token for a builder JWT and shows the sidebar; otherwise it fetches published flows and walks the user through them.

## Building

```bash
pnpm --filter @ib/sdk build
```

Produces:

- `dist/index.js` — ESM entry (used by the workspace consumers)
- `dist/index.cjs` — CJS entry
- `dist/index.d.ts` — types
- `dist/sdk.iife.global.js` — IIFE that exposes `window.InAppBoarding`, suitable for a `<script>` tag

## Tests

```bash
pnpm --filter @ib/sdk test
```

The targeting engine — `recordProfile()` and `findElement()` — is the most important thing to keep correct, so it has the densest test coverage in [`src/targeting/profile.test.ts`](src/targeting/profile.test.ts).

## Module layout

| Module                         | Role                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| `env.ts`                       | localhost / `dev_`-vs-`prod_` warnings, debug mode toggle            |
| `shadow-host.ts`               | Single open Shadow DOM via `<ib-root>`, scoped stylesheet            |
| `client.ts`                    | Fetch wrapper with bearer auth (api-key for runner, JWT for builder) |
| `targeting/profile.ts`         | 5-tier `ElementProfile` recorder + finder with cascading fallback     |
| `targeting/observer.ts`        | `MutationObserver`-backed `waitForElement(profile, { timeoutMs })`   |
| `tooltip.ts`                   | `@floating-ui/dom` based tooltip + element highlight                 |
| `builder/overlay.ts`           | Element picker, step list sidebar, save                              |
| `runner/run.ts`                | Loads published flow and walks steps                                 |
| `init.ts`                      | Public entry; routes to builder or runner based on URL params        |
