# BauPilot

**AI-powered architecture assistant for German building rule checking.**

Architects upload floor plans (JSON, PDF, or IFC/BIM) and receive **warnings about possible rule issues** (e.g. corridor width, door width, window area, escape route length, stair dimensions). BauPilot supports multi-user architecture offices with organizations, roles, and a dedicated compliance issue workflow. This MVP assists during design and does not replace official approval.

---

## Features

- **Auth:** Register (with optional **invitation key** when `INVITATION_KEYS` is set), login (JWT), profile with **change password** and **edit name**.
- **Organizations & teams:** Create organizations (Büros), invite members with roles: **owner**, **manager**, **architect**, **reviewer**, **viewer**. Assign architects to projects.
- **Projects & plans:** Create projects (with PLZ for state-specific rules), upload **JSON**, **PDF**, or **IFC/BIM** plans. PDF and IFC are extracted and parsed; JSON is most reliable for precise checks.
- **Rule engine:** Five rules: corridor width, door width (accessible), window area vs room size, escape route length, stair dimensions. All use “possible violation” wording and reference DIN/MBO where applicable.
- **Report:** Violations grouped into **Critical**, **Warnings**, and **Suggestions**. Export as PDF via browser print dialog.
- **Violations view:** Dedicated page listing violations across accessible projects. Filter by status, severity, project, rule type. Quick views: Open, Critical, Deferred, Dismissed, Resolved, My decisions.
- **Issue review workflow:** Confirm, dismiss, defer, or resolve violations. Dismiss/defer require a reason; optional comment. Audit trail for managers.
- **Plans:** Delete plans (and associated runs) from a project.

---

## Stack

| Layer        | Technology                          |
|-------------|--------------------------------------|
| Monorepo    | pnpm workspaces                      |
| Backend     | Node.js, TypeScript, Fastify        |
| Database    | PostgreSQL, Prisma                  |
| Auth        | JWT, argon2                         |
| Frontend    | React 18, TypeScript, Vite          |
| Styling     | Tailwind CSS                        |
| Rule engine | In API (`apps/api/src/rules`) and `packages/rule-engine` (dev) |

See [docs/STACK_AND_ARCHITECTURE.md](docs/STACK_AND_ARCHITECTURE.md) for full architecture.

---

## Repository structure

```
baupilot/
├── apps/
│   ├── api/          # Fastify backend, Prisma, auth, orgs, memberships, projects, plans, runs, violations
│   └── web/          # Vite + React frontend (dashboard, orgs, projects, plans, violations, report, profile)
├── packages/
│   ├── types/        # Shared types and API contracts
│   └── rule-engine/  # Rule definitions (used in dev; API bundles rules for deployment)
├── docs/             # Architecture, API, deployment, roadmap, sample plan
├── Dockerfile.api    # API production image (npm, Prisma, OpenSSL)
├── Dockerfile.web    # Web production image (pnpm build, static serve)
├── pnpm-workspace.yaml
└── package.json
```

---

## Getting started

### Prerequisites

- Node.js ≥ 20
- pnpm (e.g. `npm install -g pnpm`)
- PostgreSQL

### Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure API**

   Create `apps/api/.env` and set `DATABASE_URL` to your PostgreSQL connection string (see `apps/api/.env.example` if present).

3. **Database**

   ```bash
   pnpm db:migrate
   ```

4. **Run in development**

   ```bash
   pnpm dev
   ```

   Builds shared packages and starts API and web.

   - API: http://localhost:3001  
   - Web: http://localhost:5173 (proxies `/api` to the API)

5. **Try the app**

   - Open http://localhost:5173, register and log in (an organization is created automatically).
   - Create a project and upload a plan. Use the **sample JSON**: [docs/sample-plan.json](docs/sample-plan.json), or a PDF with readable dimension text.
   - Open the plan, click **Prüflauf starten**, then view the report (Critical / Warnings / Suggestions) and use **Als PDF exportieren** to save as PDF.
   - Use **Verstöße** in the nav to see all violations, filter, and review (confirm, dismiss, defer, resolve).

---

## Deployment

Deploy API, Web, and PostgreSQL on [Railway](https://railway.app/) using the included Dockerfiles. See **[docs/DEPLOY_RAILWAY.md](docs/DEPLOY_RAILWAY.md)** for step-by-step setup, variables, and troubleshooting.

---

## Scripts

| Command           | Description                |
|-------------------|----------------------------|
| `pnpm dev`        | Run API + web in parallel  |
| `pnpm dev:api`    | Run API only               |
| `pnpm dev:web`    | Run web only               |
| `pnpm build`      | Build all packages and apps|
| `pnpm db:migrate` | Run Prisma migrations      |
| `pnpm db:studio`  | Open Prisma Studio         |

---

## Docs

- [Stack & architecture](docs/STACK_AND_ARCHITECTURE.md)
- [Violations architecture](docs/VIOLATIONS_ARCHITECTURE.md)
- [API](docs/API.md)
- [Deploy on Railway](docs/DEPLOY_RAILWAY.md)
- [Roadmap](docs/ROADMAP.md)
- [Sample plan (JSON)](docs/sample-plan.json)

---

## License

Proprietary. All rights reserved.
