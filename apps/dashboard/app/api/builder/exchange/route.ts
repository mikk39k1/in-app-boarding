import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@ib/db";
import { hashApiKey, environmentOfKey } from "@/lib/api-key";
import { signBuilderJwt } from "@/lib/jwt";

const Body = z.object({
  token: z.string().min(1),
  apiKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { token, apiKey } = parsed.data;
  const env = environmentOfKey(apiKey);
  if (!env) {
    return NextResponse.json(
      { error: "invalid_api_key_format" },
      { status: 400 },
    );
  }

  const apiKeyHash = await hashApiKey(apiKey);
  const apiKeyRow = await prisma.apiKey.findUnique({
    where: { keyHash: apiKeyHash },
    select: {
      id: true,
      projectId: true,
      environment: true,
      revokedAt: true,
    },
  });
  if (!apiKeyRow || apiKeyRow.revokedAt) {
    return NextResponse.json({ error: "invalid_api_key" }, { status: 401 });
  }

  const builderToken = await prisma.builderToken.findUnique({
    where: { token },
    select: {
      id: true,
      projectId: true,
      environment: true,
      userId: true,
      flowId: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (
    !builderToken ||
    builderToken.consumedAt ||
    builderToken.expiresAt.getTime() < Date.now() ||
    builderToken.projectId !== apiKeyRow.projectId ||
    builderToken.environment !== apiKeyRow.environment ||
    builderToken.environment !== env
  ) {
    return NextResponse.json(
      { error: "invalid_or_expired_token" },
      { status: 401 },
    );
  }

  await prisma.$transaction([
    prisma.builderToken.update({
      where: { id: builderToken.id },
      data: { consumedAt: new Date() },
    }),
    prisma.apiKey.update({
      where: { id: apiKeyRow.id },
      data: { lastUsedAt: new Date() },
    }),
  ]);

  const jwt = await signBuilderJwt({
    sub: builderToken.userId,
    projectId: builderToken.projectId,
    environment: builderToken.environment,
    flowId: builderToken.flowId ?? undefined,
  });

  return NextResponse.json({
    jwt,
    flowId: builderToken.flowId,
    environment: builderToken.environment,
  });
}
