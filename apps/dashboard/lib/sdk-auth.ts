import type { NextRequest } from "next/server";
import { prisma, type Environment } from "@ib/db";
import { hashApiKey, environmentOfKey } from "@/lib/api-key";
import { verifyBuilderJwt } from "@/lib/jwt";

export type SdkAuth =
  | {
      kind: "api-key";
      projectId: string;
      environment: Environment;
      apiKeyId: string;
    }
  | {
      kind: "jwt";
      projectId: string;
      environment: Environment;
      userId: string;
      flowId?: string;
    };

function readBearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

/**
 * Try to authenticate an SDK request. Returns null if no/invalid credentials.
 * Accepts either:
 *   - a `dev_xxx` / `prod_xxx` API key as bearer (runner, read-only)
 *   - a builder JWT signed by /api/builder/exchange (read+write)
 */
export async function authenticateSdkRequest(
  request: NextRequest,
): Promise<SdkAuth | null> {
  const bearer = readBearer(request);
  if (!bearer) return null;

  if (bearer.startsWith("dev_") || bearer.startsWith("prod_")) {
    const env = environmentOfKey(bearer);
    if (!env) return null;
    const hash = await hashApiKey(bearer);
    const row = await prisma.apiKey.findUnique({
      where: { keyHash: hash },
      select: { id: true, projectId: true, environment: true, revokedAt: true },
    });
    if (!row || row.revokedAt || row.environment !== env) return null;
    void prisma.apiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
    return {
      kind: "api-key",
      projectId: row.projectId,
      environment: row.environment,
      apiKeyId: row.id,
    };
  }

  const claims = await verifyBuilderJwt(bearer);
  if (!claims) return null;
  return {
    kind: "jwt",
    projectId: claims.projectId,
    environment: claims.environment,
    userId: claims.sub,
    flowId: claims.flowId,
  };
}
