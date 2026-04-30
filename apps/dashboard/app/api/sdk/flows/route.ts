import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@ib/db";
import { authenticateSdkRequest } from "@/lib/sdk-auth";
import { toFlowDTO } from "@/lib/flow-dto";

export async function GET(request: NextRequest) {
  const auth = await authenticateSdkRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const flows = await prisma.flow.findMany({
    where: {
      projectId: auth.projectId,
      environment: auth.environment,
      // Runner (api-key) only sees published flows.
      ...(auth.kind === "api-key" ? { isPublished: true } : {}),
    },
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ flows: flows.map(toFlowDTO) });
}
