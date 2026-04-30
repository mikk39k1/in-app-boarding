import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@ib/db";
import { authenticateSdkRequest } from "@/lib/sdk-auth";
import { toFlowDTO } from "@/lib/flow-dto";

const ProfileSchema = z.object({
  schema: z.literal(1),
  tagName: z.string().min(1),
  dataAttr: z
    .object({ name: z.string(), value: z.string() })
    .optional(),
  id: z.string().optional(),
  role: z.string().optional(),
  ariaLabel: z.string().optional(),
  text: z.string().optional(),
  domPath: z.string().optional(),
});

const StepSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().min(0),
  title: z.string().min(1),
  body: z.string().default(""),
  targetProfile: ProfileSchema,
  placement: z.string().default("auto"),
  pageUrlPattern: z.string().nullable().optional(),
});

const PutBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  steps: z.array(StepSchema).optional(),
});

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/sdk/flows/[flowId]">,
) {
  const { flowId } = await ctx.params;
  const auth = await authenticateSdkRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const flow = await prisma.flow.findFirst({
    where: {
      id: flowId,
      projectId: auth.projectId,
      environment: auth.environment,
      ...(auth.kind === "api-key" ? { isPublished: true } : {}),
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!flow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(toFlowDTO(flow));
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/sdk/flows/[flowId]">,
) {
  const { flowId } = await ctx.params;
  const auth = await authenticateSdkRequest(request);
  if (!auth || auth.kind !== "jwt") {
    return NextResponse.json(
      { error: "builder_jwt_required" },
      { status: 401 },
    );
  }

  // The JWT is bound to a single flow if one was specified at issue time.
  if (auth.flowId && auth.flowId !== flowId) {
    return NextResponse.json(
      { error: "flow_not_in_jwt_scope" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = PutBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const flow = await prisma.flow.findFirst({
    where: {
      id: flowId,
      projectId: auth.projectId,
      environment: auth.environment,
    },
  });
  if (!flow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { name, description, isPublished, steps } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.flow.update({
      where: { id: flow.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isPublished !== undefined ? { isPublished } : {}),
      },
    });

    if (steps) {
      // Replace-all strategy keeps the editor simple. Acceptable for an MVP
      // where flows have a small number of steps.
      await tx.flowStep.deleteMany({ where: { flowId: flow.id } });
      if (steps.length > 0) {
        await tx.flowStep.createMany({
          data: steps.map((s, i) => ({
            flowId: flow.id,
            order: s.order ?? i,
            title: s.title,
            body: s.body ?? "",
            targetProfile: s.targetProfile,
            placement: s.placement ?? "auto",
            pageUrlPattern: s.pageUrlPattern ?? null,
          })),
        });
      }
    }
  });

  const updated = await prisma.flow.findUnique({
    where: { id: flow.id },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(toFlowDTO(updated!));
}
