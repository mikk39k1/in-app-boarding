import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import {
  BUILDER_JWT_TTL_SECONDS,
  type BuilderJwtClaims,
} from "@ib/shared";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function signBuilderJwt(
  claims: Omit<BuilderJwtClaims, "iat" | "exp" | "scope">,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: BuilderJwtClaims = {
    ...claims,
    scope: "builder",
    iat: now,
    exp: now + BUILDER_JWT_TTL_SECONDS,
  };
  return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .sign(getSecret());
}

export async function verifyBuilderJwt(
  token: string,
): Promise<BuilderJwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if ((payload as { scope?: string }).scope !== "builder") return null;
    return payload as unknown as BuilderJwtClaims;
  } catch {
    return null;
  }
}
