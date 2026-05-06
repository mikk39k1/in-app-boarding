"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, type Environment } from "@ib/db";
import { requireUser } from "@/lib/auth";
import {
  generateApiKey,
  hashApiKey,
  prefixOf,
} from "@/lib/api-key";

const ProjectSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const parsed = ProjectSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    redirect(`/projects?error=${encodeURIComponent("Invalid name")}`);
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      ownerId: user.id,
    },
  });

  // Auto-mint a dev + prod key on project creation so users can copy them.
  for (const env of ["DEV", "PROD"] as Environment[]) {
    const plaintext = generateApiKey(env);
    await prisma.apiKey.create({
      data: {
        projectId: project.id,
        environment: env,
        keyHash: await hashApiKey(plaintext),
        prefix: prefixOf(plaintext),
        label: env === "DEV" ? "Default dev key" : "Default prod key",
      },
    });
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}?created=1`);
}

const SettingsSchema = z.object({
  projectId: z.string().min(1),
  devBaseUrl: z.string().url().or(z.literal("")).optional(),
  prodBaseUrl: z.string().url().or(z.literal("")).optional(),
});

export async function updateProjectSettings(formData: FormData) {
  const user = await requireUser();
  const parsed = SettingsSchema.safeParse({
    projectId: formData.get("projectId"),
    devBaseUrl: formData.get("devBaseUrl"),
    prodBaseUrl: formData.get("prodBaseUrl"),
  });
  if (!parsed.success) {
    return;
  }

  await prisma.project.update({
    where: { id: parsed.data.projectId, ownerId: user.id },
    data: {
      devBaseUrl: parsed.data.devBaseUrl || null,
      prodBaseUrl: parsed.data.prodBaseUrl || null,
    },
  });
  revalidatePath(`/projects/${parsed.data.projectId}`);
}

const NewKeySchema = z.object({
  projectId: z.string().min(1),
  environment: z.enum(["DEV", "PROD"]),
  label: z.string().max(80).optional(),
});

export async function createApiKey(formData: FormData) {
  const user = await requireUser();
  const parsed = NewKeySchema.safeParse({
    projectId: formData.get("projectId"),
    environment: formData.get("environment"),
    label: formData.get("label") || undefined,
  });
  if (!parsed.success) return;

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ownerId: user.id },
  });
  if (!project) return;

  const plaintext = generateApiKey(parsed.data.environment);
  await prisma.apiKey.create({
    data: {
      projectId: project.id,
      environment: parsed.data.environment,
      keyHash: await hashApiKey(plaintext),
      prefix: prefixOf(plaintext),
      label: parsed.data.label,
    },
  });

  revalidatePath(`/projects/${project.id}`);
  redirect(
    `/projects/${project.id}?reveal=${encodeURIComponent(plaintext)}`,
  );
}

export async function revokeApiKey(formData: FormData) {
  const user = await requireUser();
  const keyId = String(formData.get("keyId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!keyId || !projectId) return;

  await prisma.apiKey.updateMany({
    where: {
      id: keyId,
      revokedAt: null,
      project: { ownerId: user.id, id: projectId },
    },
    data: { revokedAt: new Date() },
  });
  revalidatePath(`/projects/${projectId}`);
}

const NewFlowSchema = z.object({
  projectId: z.string().min(1),
  environment: z.enum(["DEV", "PROD"]),
  name: z.string().min(1).max(80),
});

export async function createFlow(formData: FormData) {
  const user = await requireUser();
  const parsed = NewFlowSchema.safeParse({
    projectId: formData.get("projectId"),
    environment: formData.get("environment"),
    name: formData.get("name"),
  });
  if (!parsed.success) return;

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ownerId: user.id },
  });
  if (!project) return;

  const flow = await prisma.flow.create({
    data: {
      projectId: project.id,
      environment: parsed.data.environment,
      name: parsed.data.name,
    },
  });

  revalidatePath(`/projects/${project.id}`);
  redirect(`/projects/${project.id}/flows/${flow.id}`);
}

export async function setFlowPublished(formData: FormData) {
  const user = await requireUser();
  const flowId = String(formData.get("flowId") ?? "");
  const isPublished = formData.get("isPublished") === "true";
  if (!flowId) return;

  const flow = await prisma.flow.findFirst({
    where: { id: flowId, project: { ownerId: user.id } },
    select: { id: true, projectId: true },
  });
  if (!flow) return;

  await prisma.flow.update({
    where: { id: flow.id },
    data: { isPublished },
  });
  revalidatePath(`/projects/${flow.projectId}`);
  revalidatePath(`/projects/${flow.projectId}/flows/${flow.id}`);
}

export async function deleteFlow(formData: FormData) {
  const user = await requireUser();
  const flowId = String(formData.get("flowId") ?? "");
  if (!flowId) return;

  const flow = await prisma.flow.findFirst({
    where: { id: flowId, project: { ownerId: user.id } },
    select: { id: true, projectId: true },
  });
  if (!flow) return;

  await prisma.flow.delete({ where: { id: flow.id } });
  redirect(`/projects/${flow.projectId}`);
}
