# BauPilot – Development Milestones

## M1: Run the stack (Day 1)

- [ ] Clone repo, install deps: `pnpm install`
- [ ] Copy `apps/api/.env.example` → `apps/api/.env`, set `DATABASE_URL`
- [ ] Create DB: `pnpm db:migrate`
- [ ] Start API: `pnpm dev:api` (port 3001)
- [ ] Start web: `pnpm dev:web` (port 5173)
- [ ] Register a user, create a project, upload `docs/sample-plan.json`, run check, view report

## M2: First rule and UI polish (Week 1)

- [ ] Add one more rule in `packages/rule-engine` (e.g. min room area or ceiling height)
- [ ] Show rule list or rule categories on report screen
- [ ] Add loading skeletons for dashboard and project list
- [ ] Add disclaimer banner: "Mögliche Verstöße – keine rechtliche Bewertung"

## M3: Export and persistence (Week 2)

- [ ] Implement report export: HTML or PDF (e.g. react-pdf or server-side HTML→PDF)
- [ ] Ensure runs and violations are persisted and reloadable
- [ ] Plan detail: show extracted elements summary (count of rooms, doors, etc.)

## M4: PDF and production prep (Week 3–4)

- [ ] Optional: PDF text/layer extraction (mock or real) and map to PlanElements
- [ ] Environment-based config (API URL for frontend, upload dir, S3 placeholder)
- [ ] Basic error boundaries and 404 page in frontend
- [ ] Document what is mocked vs production-ready in README

## M5: Extensibility (Ongoing)

- [ ] Rule engine: load rule set by region or project (config or DB)
- [ ] API versioning or `/v1/` prefix if needed
- [ ] OpenAPI/Swagger for API docs
