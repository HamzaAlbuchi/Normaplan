# BauPilot – Stack Proposal & Technical Architecture

## 1. Recommended Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Monorepo** | pnpm workspaces | Single repo, shared types and rule engine, clear boundaries |
| **Backend** | Node.js + TypeScript + Fastify | Fast, type-safe, small team–friendly; easy to add routes and plugins |
| **Database** | PostgreSQL + Prisma | Robust, JSON support for rule configs, migrations, great DX |
| **Auth** | JWT + argon2 (MVP) | No vendor lock-in; can swap to Auth.js/Clerk later |
| **Frontend** | React 18 + TypeScript + Vite | Modern, fast HMR, standard ecosystem |
| **Styling** | Tailwind CSS | Rapid UI, professional look, easy theming |
| **Data fetching** | TanStack Query | Server state, caching, loading/error states |
| **File storage** | Local disk (MVP) / S3-compatible later | Simple for MVP; same API for MinIO or S3 |
| **Rule engine** | Custom TS module (`packages/rule-engine`) | Pluggable rules, testable, no runtime dependency on DB |

### Why this stack

- **Scalable backend**: Fastify is fast and modular; Prisma scales to multiple services and read replicas later.
- **Simple but professional UI**: React + Tailwind gives a clean, maintainable frontend without a heavy design system for MVP.
- **Modular rule engine**: Rules live in a separate package; they can be versioned, tested, and later driven by config or per–Bundesland.
- **Room for AI**: Clear extension points: “plan parsing” and “rule suggestions” can later call ML/LLM services without changing the core flow.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              BauPilot                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  apps/web (React)          │  apps/api (Fastify)                         │
│  - Auth (login/register)   │  - REST API                                 │
│  - Plan upload             │  - Auth (JWT)                               │
│  - Report / warnings       │  - File storage (plans)                     │
│  - Export summary          │  - Plan parsing (MVP: mock / PDF extract)   │
│                            │  - Rule engine invocation                  │
├────────────────────────────┼─────────────────────────────────────────────┤
│  packages/rule-engine      │  packages/types                             │
│  - Rule definitions        │  - Shared DTOs, API contracts              │
│  - Run checks on plan data │  - Plan element types                       │
├────────────────────────────┴─────────────────────────────────────────────┤
│  PostgreSQL (users, projects, plans, reports, runs)                      │
│  File store (uploaded plan files: PDF now, IFC/DWG later)                 │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data flow (MVP)**

1. User signs in → JWT.
2. User uploads plan file → API stores file, creates “plan” record, queues or runs “extraction” (MVP: mock extraction returns structured plan elements).
3. API runs rule engine on extracted plan → produces “run” and “violations”.
4. Frontend fetches run + violations → shows report; user can export summary.

---

## 3. MVP vs Production-Grade

| Area | MVP | Later (production / AI) |
|------|-----|--------------------------|
| **Plan parsing** | Mock: accept JSON upload of plan elements, or simple PDF text/layer extraction | IFC parser, DWG via external API, CV/ML for dimensions from raster PDF |
| **Rules** | 5–10 hardcoded measurable rules (corridor width, door width, window area, escape route length, stair dimensions) | Rule config in DB, per-Bundesland, optional AI-suggested rules |
| **Auth** | Email + password, JWT | OAuth, magic link, org/team support |
| **File storage** | Local disk | S3/MinIO, virus scan, retention |
| **Report export** | PDF or HTML summary (e.g. react-pdf or server-rendered HTML) | Templates, branding, multi-language |

---

## 4. Plan Parsing Strategy

**MVP**

- **Option A (recommended for dev):** User uploads a **JSON file** that describes the plan (rooms, doors, corridors, windows, stairs). No real PDF parsing. Fast to implement and test the rule engine and UI.
- **Option B:** Upload PDF; backend uses `pdf-lib` / `pdfjs-dist` to extract text and (if available) simple dimensions from annotations. Fallback: “Manual input” form to enter key dimensions.

**Later**

- **IFC:** Use a library (e.g. IFC.js or server-side parser) to parse IFC and map to internal plan model.
- **DWG:** Use a third-party API or converter (e.g. to DXF/IFC) then parse.
- **Raster/vector PDF:** Computer vision or commercial API to detect walls, doors, dimensions and fill the plan model.

The **internal plan model** (see `packages/types`) is format-agnostic: rooms, openings, corridors, stairs, etc. All parsers produce this model so the rule engine stays unchanged.

---

## 5. Security & Compliance Notes

- Warnings are “possible violations”; no legal certainty. UI and exports must state this clearly.
- Store only what’s needed (e.g. hashed passwords, plan metadata, run results). Plan files can be deleted after extraction if desired.
- GDPR: document data retention and user data handling for German market.

---

## 6. Repository Layout (Monorepo)

```
baupilot/
├── apps/
│   ├── api/                 # Fastify backend
│   └── web/                 # Vite + React frontend
├── packages/
│   ├── types/               # Shared TypeScript types & API contracts
│   └── rule-engine/        # Rule definitions & execution
├── docs/                    # Architecture, API, roadmap
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

See the rest of the repo for the actual folder structure, API design, rule engine design, and roadmap.
