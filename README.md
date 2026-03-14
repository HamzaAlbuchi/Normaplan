# BauPilot

**AI-powered architecture assistant for German building rule checking.**

Architects upload a floor plan and receive **warnings about possible missed rules** (e.g. corridor width, door width, window area, escape route length, stair dimensions). This MVP assists during design and does not replace official approval. The product is designed to evolve into a pre-submission permit check tool and to support different Bundesländer rules later.

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
| Rule engine | Custom TS module (`packages/rule-engine`) |

See [docs/STACK_AND_ARCHITECTURE.md](docs/STACK_AND_ARCHITECTURE.md) for full architecture and plan-parsing strategy.

---

## Repository structure

```
baupilot/
├── apps/
│   ├── api/          # Fastify backend, Prisma, auth, uploads, runs
│   └── web/          # Vite + React frontend
├── packages/
│   ├── types/        # Shared types and API contracts
│   └── rule-engine/  # Rule definitions and execution
├── docs/             # Architecture, API, roadmap, sample plan
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

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

   Edit `apps/api/.env`: set `DATABASE_URL` to your PostgreSQL connection string.

3. **Database**

   ```bash
   pnpm db:migrate
   ```

4. **Run in development**

   ```bash
   pnpm dev
   ```

   This builds shared packages (`types`, `rule-engine`) once, then starts API and web.

   - API: http://localhost:3001  
   - Web: http://localhost:5173 (proxies `/api` to the API)

5. **Try the MVP**

   - Open http://localhost:5173, register and log in.
   - Create a project, then upload a plan. For the MVP use the **sample JSON plan**: [docs/sample-plan.json](docs/sample-plan.json) (upload it as the “plan file”).
   - Open the plan and click **Prüflauf starten**. View the report with possible violations and suggestions.

---

## MVP scope

- **Auth:** Register, login, JWT.
- **Projects & plans:** Create project, upload plan file. MVP accepts **JSON** plan (see sample); PDF is stored but extraction is not implemented.
- **Rule engine:** Five rules: corridor width, door width (accessible), window area vs room size, escape route length, stair dimensions. All use “possible violation” wording.
- **Report:** List of violations with severity, message, suggestion, affected elements, and regulation reference. Export (PDF/HTML) is stubbed for a later version.

**Mocked / not production-grade in MVP**

- Plan parsing from PDF (use JSON upload for testing).
- File storage is local disk; replace with S3-compatible later.
- Export report: UI placeholder only.

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
- [Roadmap](docs/ROADMAP.md)
- [Milestones](docs/MILESTONES.md)
- [Sample plan (JSON)](docs/sample-plan.json)

---

## License

Proprietary. All rights reserved.
