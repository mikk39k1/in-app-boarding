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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createApiKey,
  createFlow,
  revokeApiKey,
  updateProjectSettings,
} from "../actions";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reveal?: string; created?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { reveal, created } = await searchParams;

  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id },
    include: {
      apiKeys: { orderBy: { createdAt: "desc" } },
      flows: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!project) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/projects"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {project.name}
        </h1>
      </div>

      {created && (
        <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm">
          Project created. Default dev and prod keys are below — copy your dev
          key into <code>apps/demo-client/.env.local</code> as{" "}
          <code>NEXT_PUBLIC_IB_KEY</code>.
        </div>
      )}

      {reveal && (
        <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base">New API key</CardTitle>
            <CardDescription>
              Copy this now. You won&apos;t be able to see it again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded-md bg-background p-3 text-sm">
              {reveal}
            </code>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="flows">
        <TabsList>
          <TabsTrigger value="flows">Flows</TabsTrigger>
          <TabsTrigger value="keys">API keys</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New flow</CardTitle>
              <CardDescription>Choose dev or prod environment.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createFlow} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="projectId" value={project.id} />
                <div className="flex-1 space-y-1.5 min-w-[200px]">
                  <Label htmlFor="flow-name">Name</Label>
                  <Input
                    id="flow-name"
                    name="name"
                    placeholder="Welcome tour"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="flow-env">Environment</Label>
                  <select
                    id="flow-env"
                    name="environment"
                    className="flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue="DEV"
                  >
                    <option value="DEV">Dev</option>
                    <option value="PROD">Prod</option>
                  </select>
                </div>
                <Button type="submit">Create flow</Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {project.flows.length === 0 && (
              <p className="text-sm text-muted-foreground">No flows yet.</p>
            )}
            {project.flows.map((f) => (
              <Link
                key={f.id}
                href={`/projects/${project.id}/flows/${f.id}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.environment.toLowerCase()} ·{" "}
                        {f.isPublished ? "published" : "draft"}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">→</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create API key</CardTitle>
              <CardDescription>
                Dev keys are safe for localhost. Prod keys are for production
                deploys only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createApiKey} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="projectId" value={project.id} />
                <div className="flex-1 space-y-1.5 min-w-[200px]">
                  <Label htmlFor="key-label">Label (optional)</Label>
                  <Input id="key-label" name="label" placeholder="CI key" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="key-env">Environment</Label>
                  <select
                    id="key-env"
                    name="environment"
                    className="flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm"
                    defaultValue="DEV"
                  >
                    <option value="DEV">Dev</option>
                    <option value="PROD">Prod</option>
                  </select>
                </div>
                <Button type="submit">Create key</Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {project.apiKeys.map((k) => (
              <Card key={k.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="space-y-0.5">
                    <div className="font-mono text-sm">
                      {k.prefix}
                      <span className="text-muted-foreground">…</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {k.environment.toLowerCase()}
                      {k.label ? ` · ${k.label}` : ""}
                      {k.revokedAt ? " · revoked" : ""}
                    </div>
                  </div>
                  {!k.revokedAt && (
                    <form action={revokeApiKey}>
                      <input type="hidden" name="keyId" value={k.id} />
                      <input type="hidden" name="projectId" value={project.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Revoke
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Base URLs</CardTitle>
              <CardDescription>
                Where the dashboard should redirect to when launching the
                builder. Used for CORS allow-listing too.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateProjectSettings} className="space-y-4">
                <input type="hidden" name="projectId" value={project.id} />
                <div className="space-y-1.5">
                  <Label htmlFor="dev-url">Dev base URL</Label>
                  <Input
                    id="dev-url"
                    name="devBaseUrl"
                    defaultValue={project.devBaseUrl ?? ""}
                    placeholder="http://localhost:3001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prod-url">Prod base URL</Label>
                  <Input
                    id="prod-url"
                    name="prodBaseUrl"
                    defaultValue={project.prodBaseUrl ?? ""}
                    placeholder="https://app.example.com"
                  />
                </div>
                <Button type="submit">Save</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
