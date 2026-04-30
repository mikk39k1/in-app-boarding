# @ib/demo-client

Minimal Next.js 16 app that hosts the SDK so you can test the platform end-to-end. Runs on port **3001**.

It deliberately ships a mix of element styles so the targeting engine has real cases to handle:

| Element                     | Anchor signal it offers                |
| --------------------------- | -------------------------------------- |
| "Invite team" button        | `data-onboarding="invite-team"` + `aria-label` |
| "Overview" tab              | `data-onboarding="tab-overview"`       |
| "Settings" tab              | text content only                      |
| "Integrations" tab          | `aria-label` only                      |
| Revenue card                | stable `id="metric-revenue"`           |
| Users card                  | `data-onboarding="users-card"` + `aria-label` |
| Health card                 | text content only (no anchors)         |
| Save changes button         | `data-onboarding="save-settings"` + `aria-label` |
| Workspace name input        | stable `id="workspace-name"`           |

## Setup

After creating a project in the dashboard, paste its `dev_xxx` API key into a new file:

```dotenv
# apps/demo-client/.env.local
NEXT_PUBLIC_IB_KEY=dev_paste_your_key_here
NEXT_PUBLIC_IB_API_URL=http://localhost:3000
```

The hot reload picks this up; you don't need to restart the dev server.

## Run / typecheck / build

```bash
pnpm --filter @ib/demo-client dev
pnpm --filter @ib/demo-client typecheck
pnpm --filter @ib/demo-client build
```
