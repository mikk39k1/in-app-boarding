import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@ib/db";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteFlow,
  setFlowPublished,
} from "@/app/(app)/projects/actions";
import { launchBuilder } from "./actions";

export default async function FlowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; flowId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id, flowId } = await params;
  const { error } = await searchParams;

  const flow = await prisma.flow.findFirst({
    where: {
      id: flowId,
      projectId: id,
      project: { ownerId: user.id },
    },
    include: {
      project: true,
      steps: { orderBy: { order: "asc" } },
    },
  });
  if (!flow) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/projects/${flow.projectId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {flow.project.name}
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{flow.name}</h1>
          <span className="rounded-full border px-2 py-0.5 text-xs">
            {flow.environment.toLowerCase()} ·{" "}
            {flow.isPublished ? "published" : "draft"}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Edit in builder</CardTitle>
          <CardDescription>
            Opens your client app with the in-app builder overlay loaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <form action={launchBuilder}>
            <input type="hidden" name="flowId" value={flow.id} />
            <input type="hidden" name="environment" value="DEV" />
            <Button type="submit" disabled={!flow.project.devBaseUrl}>
              Edit on Dev
            </Button>
          </form>
          <form action={launchBuilder}>
            <input type="hidden" name="flowId" value={flow.id} />
            <input type="hidden" name="environment" value="PROD" />
            <Button
              type="submit"
              variant="outline"
              disabled={!flow.project.prodBaseUrl}
            >
              Edit on Prod
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps ({flow.steps.length})</CardTitle>
          <CardDescription>
            Steps are added by clicking elements in the builder overlay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {flow.steps.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No steps yet. Click <strong>Edit on Dev</strong> to add some.
            </p>
          )}
          {flow.steps.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <div className="text-sm font-medium">
                  {s.order + 1}. {s.title}
                </div>
                <div className="text-xs text-muted-foreground">{s.body}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publish</CardTitle>
          <CardDescription>
            Published flows are returned to the SDK runner without a builder
            JWT.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <form action={setFlowPublished}>
            <input type="hidden" name="flowId" value={flow.id} />
            <input
              type="hidden"
              name="isPublished"
              value={flow.isPublished ? "false" : "true"}
            />
            <Button type="submit">
              {flow.isPublished ? "Unpublish" : "Publish"}
            </Button>
          </form>
          <form action={deleteFlow}>
            <input type="hidden" name="flowId" value={flow.id} />
            <Button type="submit" variant="destructive">
              Delete flow
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
