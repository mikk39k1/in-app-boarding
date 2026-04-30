import type { Environment } from "./flow";

/**
 * Claims signed into the short-lived builder JWT that the SDK obtains by
 * exchanging a one-time builder_token. Used to authorise builder writes
 * (PUT /api/sdk/flows/:id) without requiring the dashboard session.
 */
export interface BuilderJwtClaims {
  sub: string; // user id (Supabase auth)
  projectId: string;
  environment: Environment;
  flowId?: string;
  scope: "builder";
  iat: number;
  exp: number;
}

export const BUILDER_JWT_TTL_SECONDS = 30 * 60; // 30 min
export const BUILDER_TOKEN_TTL_SECONDS = 5 * 60; // 5 min URL token
