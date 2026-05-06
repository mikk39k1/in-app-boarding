import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@ib/db";
import { hashApiKey, environmentOfKey } from "@/lib/api-key";
import { verifyBuilderJwt } from "@/lib/jwt";

const ALLOWED_HEADERS = "Authorization, Content-Type, X-IB-Api-Key";
const ALLOWED_METHODS = "GET, POST, PUT, OPTIONS";

function isLocalhost(origin: string): boolean {
  try {
    const u = new URL(origin);
    const host = u.hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

function readBearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

/**
 * Look up the project tied to the bearer. Supports both auth modes:
 *   - dev_/prod_ API key  -> identify project via the key's hash
 *   - builder JWT         -> identify project via the JWT claims
 * Returns null if the bearer is missing or doesn't resolve to a known project.
 */
async function projectOriginsFromRequest(
  request: NextRequest,
): Promise<{
  devBaseUrl: string | null;
  prodBaseUrl: string | null;
  environment: "DEV" | "PROD";
} | null> {
  const bearer =
    readBearer(request) ?? request.headers.get("x-ib-api-key");
  if (!bearer) return null;

  // API key path
  const env = environmentOfKey(bearer);
  if (env) {
    const hash = await hashApiKey(bearer);
    const row = await prisma.apiKey.findUnique({
      where: { keyHash: hash },
      select: {
        revokedAt: true,
        environment: true,
        project: {
          select: { devBaseUrl: true, prodBaseUrl: true },
        },
      },
    });
    if (!row || row.revokedAt || row.environment !== env) return null;
    return {
      devBaseUrl: row.project.devBaseUrl,
      prodBaseUrl: row.project.prodBaseUrl,
      environment: env,
    };
  }

  // Builder JWT path
  const claims = await verifyBuilderJwt(bearer);
  if (!claims) return null;
  const project = await prisma.project.findUnique({
    where: { id: claims.projectId },
    select: { devBaseUrl: true, prodBaseUrl: true },
  });
  if (!project) return null;
  return {
    devBaseUrl: project.devBaseUrl,
    prodBaseUrl: project.prodBaseUrl,
    environment: claims.environment,
  };
}

function originAllowedFor(
  origin: string,
  env: "DEV" | "PROD",
  devBaseUrl: string | null,
  prodBaseUrl: string | null,
): boolean {
  // Dev keys: any localhost origin works without further config; an explicit
  // devBaseUrl exact match is also accepted.
  if (env === "DEV") {
    if (isLocalhost(origin)) return true;
    if (devBaseUrl && origin === stripTrailingSlash(devBaseUrl)) return true;
    return false;
  }
  // Prod keys: exact match against prodBaseUrl only.
  if (prodBaseUrl && origin === stripTrailingSlash(prodBaseUrl)) return true;
  return false;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function handleSdkCors(
  request: NextRequest,
): Promise<NextResponse | null> {
  const origin = request.headers.get("origin");
  if (!origin) return null; // Same-origin or non-CORS request — let it through.

  const isPreflight = request.method === "OPTIONS";

  // For the public exchange endpoint we accept any origin since it only uses
  // a one-time token bound to a specific project; we still echo the origin to
  // make browsers happy.
  if (request.nextUrl.pathname.startsWith("/api/builder/exchange")) {
    const headers = new Headers({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": ALLOWED_HEADERS,
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
    if (isPreflight) {
      return new NextResponse(null, { status: 204, headers });
    }
    const passthrough = NextResponse.next();
    headers.forEach((v, k) => passthrough.headers.set(k, v));
    return passthrough;
  }

  // For SDK endpoints the bearer token tells us which project (and therefore
  // which origin) is authorised.
  if (
    !request.nextUrl.pathname.startsWith("/api/sdk") &&
    !request.nextUrl.pathname.startsWith("/api/builder")
  ) {
    return null;
  }

  // Preflight has no bearer to inspect. Allow loosely for OPTIONS — the
  // actual request will be re-checked.
  if (isPreflight) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": ALLOWED_METHODS,
        "Access-Control-Allow-Headers": ALLOWED_HEADERS,
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }

  const project = await projectOriginsFromRequest(request);

  // Origin policy: if we resolved a project, enforce its dev/prod URL list.
  // If we couldn't resolve one (bad/missing bearer), still attach permissive
  // CORS headers so the downstream 401 is visible to the client instead of
  // being eaten by the browser as "Failed to fetch".
  if (
    project &&
    !originAllowedFor(
      origin,
      project.environment,
      project.devBaseUrl,
      project.prodBaseUrl,
    )
  ) {
    return new NextResponse("CORS: origin not allowed for this project", {
      status: 403,
      headers: {
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
      },
    });
  }

  const passthrough = NextResponse.next();
  passthrough.headers.set("Access-Control-Allow-Origin", origin);
  passthrough.headers.set("Access-Control-Allow-Credentials", "false");
  passthrough.headers.set("Vary", "Origin");
  return passthrough;
}
