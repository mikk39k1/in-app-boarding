# In-App Onboarding Platform

A monorepo implementing the [architecture decision record](architecture_decision_record.md): a one-time-install SDK + a Next.js dashboard that lets non-developers visually build and publish in-app onboarding flows on top of any web app.

## What's in here

```text
in-app-boarding/
  apps/
    dashboard/      Next.js 16 — admin UI + API (port 3000)
    demo-client/    Tiny Next.js app to test the SDK against (port 3001)
  packages/
    sdk/            @ib/sdk — Shadow DOM, 5-tier element targeting, Floating UI tooltip
    db/             @ib/db — Prisma schema + client (Supabase Postgres)
    shared/         @ib/shared — types shared between SDK and dashboard
```

The SDK is loaded by the demo client. The dashboard owns auth, flow CRUD, API keys, and the builder JWT exchange. CORS is handled by a Next.js 16 **Proxy** (formerly middleware) at [`apps/dashboard/proxy.ts`](apps/dashboard/proxy.ts).

## Prerequisites

- Node.js ≥ 20
- A Supabase project (for Auth + Postgres). Free tier is fine.

## First-time setup

```bash
corepack enable                    # activates the pinned pnpm version
pnpm install                       # installs every workspace
cp .env.example .env               # then edit .env with your Supabase creds
pnpm db:generate                   # generate the Prisma client
pnpm db:push                       # push the schema to your Supabase Postgres
```

`.env` needs:

| Var                                    | Where to find it                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase → Project settings → API                                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project settings → API Keys → **Publishable key** (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY`                  | Supabase → Project settings → API Keys → **Secret key** (`sb_secret_...`, server only) |
| `DATABASE_URL`                         | Supabase → Project settings → Database → "Connection pooling" (Supavisor pooled URL)|
| `DIRECT_URL`                           | Supabase → Project settings → Database (direct, port 5432; used by Prisma migrate)  |
| `JWT_SECRET`                           | Any random ≥ 32-byte string. `openssl rand -base64 48` works                        |
| `NEXT_PUBLIC_DASHBOARD_URL`            | `http://localhost:3000` for local dev                                               |

> **Legacy keys still work.** If your project predates the new key system or you prefer the JWT-style `anon` / `service_role` keys, paste them into the same env vars — Supabase accepts both.

> **Supabase Auth tip:** in Supabase → Authentication → URL Configuration, add `http://localhost:3000` to "Site URL" so email confirmations redirect correctly.

## Run everything

```bash
pnpm dev
```

Turbo will spin up:
- Dashboard at http://localhost:3000
- Demo client at http://localhost:3001

## How to test the full flow end-to-end

1. **Sign up.** Go to http://localhost:3000, click "Sign up", create an account.
2. **Create a project.** From `/projects`, give it a name. The platform auto-mints a `dev_xxx` key (revealed once on the project page) and a `prod_xxx` key.
3. **Configure the demo client.** Copy the `dev_xxx` key. Create `apps/demo-client/.env.local` with:
   ```dotenv
   NEXT_PUBLIC_IB_KEY=dev_paste_your_key_here
   NEXT_PUBLIC_IB_API_URL=http://localhost:3000
   ```
   The demo's hot reload will pick this up.
4. **Create a flow.** Back in the dashboard, on the project page, switch to the "Flows" tab and create a new flow (default environment is Dev — leave it).
5. **Open it in the builder.** Click into the flow, then **Edit on Dev**. The dashboard mints a one-time `builder_token`, redirects you to `http://localhost:3001/?ib_builder_token=…`, and the SDK exchanges the token for a builder JWT and shows a sidebar in the top-right of the demo client.
6. **Add steps.** Click **+ Add step (pick element)**, then click any element on the demo (try the "Invite team" button, the "Users" card, or the "Save changes" button on the Settings tab). Fill in title and body. Repeat for as many steps as you want, then click **Save**.
7. **Publish & run.** Back on the flow page in the dashboard, click **Publish**. Then visit http://localhost:3001 in a fresh tab (no `?ib_builder_token`) — the SDK runner will fetch the published flow and walk you through the steps with tooltips. Click **Done** on the last step to mark the flow complete (stored in `localStorage`).
8. **Targeting fallback.** Open devtools and remove the `data-onboarding` attribute from one of the elements you targeted. Reload — the runner should still find the element via tier 2/3/4/5 (id, aria-label, text, or DOM path) and show its tooltip, possibly logging which tier matched if dev mode is active.
9. **Negative test (env isolation).** Try setting `NEXT_PUBLIC_IB_KEY` to a `prod_` key. The SDK will refuse to initialise on `localhost` and log a loud error — exactly per the ADR.

## Common commands

| Command                       | What it does                                          |
| ----------------------------- | ----------------------------------------------------- |
| `pnpm dev`                    | Run dashboard (3000) and demo (3001) in parallel      |
| `pnpm build`                  | Build everything                                       |
| `pnpm typecheck`              | TypeScript across all workspaces                      |
| `pnpm test`                   | Run vitest (currently the SDK targeting tests)        |
| `pnpm db:push`                | Push the Prisma schema to your DB                     |
| `pnpm db:studio`              | Prisma Studio — browse the data                       |
| `pnpm --filter @ib/sdk build` | Just the SDK                                          |

## Architecture in 30 seconds

```text
Marketing user → Dashboard (Next.js 16) → Postgres (Supabase + Prisma)
                       │
                       │ "Edit on Dev"
                       ▼
                 issues short-lived builder_token in URL
                       │
                       ▼
                 redirects to http://localhost:3001/?ib_builder_token=…
                       │
                       ▼
                 Demo client (loads @ib/sdk via workspace import)
                       │ POST /api/builder/exchange { token, apiKey }
                       ▼
                 receives JWT, mounts builder Shadow DOM,
                 runs element picker → records 5-tier ElementProfile,
                 PUT /api/sdk/flows/:id with steps[]
                       │
                       ▼ (when JWT absent and key is plain dev_/prod_)
                 runs published flows: tooltip walkthrough using
                 Floating UI + MutationObserver fallback
```

## Why these design choices?

The full reasoning lives in [architecture_decision_record.md](architecture_decision_record.md). Highlights:

- **Shadow DOM** isolates the builder/runner CSS from the host site's stylesheet (and vice versa).
- **Five-tier element profile** with cascading fallback survives most refactors of the host app: data-attribute → stable id → aria-label/role → inner text → structural DOM path.
- **MutationObserver** waits for elements that don't exist on initial paint (SPAs, lazy-loaded content).
- **URL-token-to-JWT handshake** sidesteps third-party cookie blocking (Safari ITP) and avoids embedding the dashboard's session into the client app.
- **Stripe-style env keys** (`dev_`/`prod_`) with localhost detection prevent accidental production data pollution from local dev.

## What's intentionally out of scope (yet)

- Multi-tenant orgs (each user owns their own projects directly).
- Row-Level Security in Postgres (we enforce ownership at the API layer; switching to RLS is a follow-up).
- Analytics on flow completion / drop-off.
- Branching, segmentation, A/B targeting on flows.
- Theme customisation of the tooltip.

## Next.js 16 specifics worth knowing

- `middleware.ts` is now `proxy.ts` — see `apps/dashboard/proxy.ts`.
- Route Handlers under `app/api/.../route.ts` use the new `RouteContext<'/path/[id]'>` typed params helper. Run `pnpm --filter @ib/dashboard exec next typegen` once after pulling fresh code if your IDE complains it can't find `RouteContext`.
- Project mutations use Server Actions per the v16 auth guide.
