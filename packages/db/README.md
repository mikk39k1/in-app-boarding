# @ib/db

Prisma schema and client for the in-app onboarding platform.

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma) and mirrors Supabase `auth.users` by UUID.

## Common commands

| Command           | What it does                                |
| ----------------- | ------------------------------------------- |
| `pnpm db:push`    | Push the schema to the configured database |
| `pnpm db:studio`  | Open Prisma Studio                          |
| `pnpm --filter @ib/db prisma:generate` | Regenerate the typed Prisma client |

Consumers import the client like:

```ts
import { prisma, type Environment } from "@ib/db";
```

The client is memoised on `globalThis` in dev so HMR doesn't open a new connection per reload.
