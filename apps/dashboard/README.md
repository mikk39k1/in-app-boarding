# @ib/dashboard

Next.js 16 app combining the admin dashboard UI and the backend API for the in-app onboarding platform.

Runs on port **3000** during dev (`pnpm dev` from the repo root).

## Structure

```text
apps/dashboard/
  app/
    (auth)/login            # login page + signup; uses Supabase Auth
    (auth)/signup
    (app)/                  # session-protected route group
      projects/             # list, create, project detail (settings, keys, flows)
        [id]/flows/[flowId] # flow detail, "Edit on Dev/Prod" launcher
    api/
      builder/exchange      # POST: exchanges builder_token + apiKey for a JWT
      sdk/flows             # GET: lists flows visible to the bearer
      sdk/flows/[flowId]    # GET / PUT: read or save a flow (JWT-only writes)
    auth/callback           # Supabase OAuth/email-confirm landing
  lib/
    supabase/{client,server,proxy}.ts
    auth.ts                 # requireUser() — Supabase session + user mirror
    api-key.ts              # generate/hash/prefix dev_/prod_ keys
    jwt.ts                  # sign/verify builder JWTs via jose
    sdk-auth.ts             # bearer-token resolver (api-key OR JWT)
    cors.ts                 # project-aware CORS, allows localhost for dev keys
    flow-dto.ts             # Prisma row → @ib/shared FlowDTO
  components/ui/            # ShadCN-style primitives (button, input, dialog, …)
  proxy.ts                  # Next.js 16 Proxy: handles CORS for /api/sdk and /api/builder, refreshes Supabase session for everything else
```

## Auth model

- Supabase Auth manages signup/login. We mirror `auth.users` into our `users` table by UUID via `requireUser()` so foreign keys stay clean.
- For SDK-facing endpoints we authenticate by **bearer token**:
  - `dev_xxx` / `prod_xxx` → API key (read-only runner)
  - JWT signed by us → builder (read + write)

## Run / typecheck / build (this app only)

```bash
pnpm --filter @ib/dashboard dev
pnpm --filter @ib/dashboard typecheck
pnpm --filter @ib/dashboard build
```

After changing route params or adding new dynamic routes you may need to regenerate the `RouteContext` types:

```bash
pnpm --filter @ib/dashboard exec next typegen
```
