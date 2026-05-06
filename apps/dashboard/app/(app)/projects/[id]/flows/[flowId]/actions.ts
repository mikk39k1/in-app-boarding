"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { prisma } from "@ib/db";
import { requireUser } from "@/lib/auth";
import { BUILDER_TOKEN_TTL_SECONDS } from "@ib/shared";

export async function launchBuilder(formData: FormData) {
  const user = await requireUser();
  const flowId = String(formData.get("flowId") ?? "");
  const environment = formData.get("environment") as "DEV" | "PROD" | undefined;
  if (!flowId || (environment !== "DEV" && environment !== "PROD")) return;

  const flow = await prisma.flow.findFirst({
    where: { id: flowId, project: { ownerId: user.id } },
    include: { project: true },
  });
  if (!flow) return;

  const baseUrl =
    environment === "DEV" ? flow.project.devBaseUrl : flow.project.prodBaseUrl;
  if (!baseUrl) {
    redirect(
      `/projects/${flow.projectId}/flows/${flow.id}?error=${encodeURIComponent(
        `${environment} base URL not configured`,
      )}`,
    );
  }

  const token = randomBytes(24).toString("base64url");
  await prisma.builderToken.create({
    data: {
      token,
      projectId: flow.projectId,
      environment,
      userId: user.id,
      flowId: flow.id,
      expiresAt: new Date(Date.now() + BUILDER_TOKEN_TTL_SECONDS * 1000),
    },
  });

  const url = new URL(baseUrl!);
  url.searchParams.set("ib_builder_token", token);
  url.searchParams.set("ib_flow", flow.id);
  redirect(url.toString());
}
