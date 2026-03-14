# BauPilot

**AI-powered architecture assistant for German building rule checking.**

Architects upload a floor plan (JSON or PDF) and receive **warnings about possible rule issues** (e.g. corridor width, door width, window area, escape route length, stair dimensions). This MVP assists during design and does not replace official approval. The product is designed to evolve into a pre-submission permit check tool and to support different Bundesländer rules later.

---

## Features

- **Auth:** Register (with optional **invitation key** when `INVITATION_KEYS` is set), login (JWT), profile with **change password** and **edit name**.
- **Projects & plans:** Create projects, upload **JSON** or **PDF** plans. PDF text is extracted and parsed heuristically (best-effort); JSON is more reliable for precise checks.
- **Rule engine:** Five rules: corridor width, door width (accessible), window area vs room size, escape route length, stair dimensions. All use “possible violation” wording and reference DIN/MBO where applicable.
- **Report:** Violations are grouped into **Critical**, **Warnings**, and **Suggestions**. Export the report **as PDF** via the browser print dialog (Save as PDF).
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
│   ├── api/          # Fastify backend, Prisma, auth, plan upload/delete, PDF extraction, rule runs
│   └── web/          # Vite + React frontend (dashboard, projects, plans, report, profile)
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

   - Open http://localhost:5173, register and log in.
   - Create a project and upload a plan. Use the **sample JSON**: [docs/sample-plan.json](docs/sample-plan.json), or a PDF with readable dimension text.
   - Open the plan, click **Prüflauf starten**, then view the report (Critical / Warnings / Suggestions) and use **Als PDF exportieren** to save as PDF.

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
- [API](docs/API.md)
- [Deploy on Railway](docs/DEPLOY_RAILWAY.md)
- [Roadmap](docs/ROADMAP.md)
- [Sample plan (JSON)](docs/sample-plan.json)

---

## License

Proprietary. All rights reserved.
