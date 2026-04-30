# @ib/shared

Pure TypeScript types shared between `@ib/sdk` and `@ib/dashboard`. No runtime code.

- [`profile.ts`](src/profile.ts) — the 5-tier `ElementProfile` interface that the SDK records and the dashboard persists.
- [`flow.ts`](src/flow.ts) — `FlowDTO`, `FlowStepDTO`, `Placement`, `Environment`.
- [`jwt.ts`](src/jwt.ts) — `BuilderJwtClaims` and TTL constants used by both the issuer (dashboard) and the consumer (SDK).
