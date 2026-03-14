# BauPilot – Roadmap

## Phase 1: MVP (current)

- [x] Auth (register, login, JWT)
- [x] Projects & plan upload (JSON plan accepted)
- [x] Mock plan parser (JSON → PlanElements)
- [x] Rule engine with 5 rules (corridor, door, window, escape route, stair)
- [x] Run checks and store violations
- [x] Report screen with warnings and suggestions
- [ ] Export report (PDF/HTML) — stub only in MVP

## Phase 2: Plan parsing & production readiness

- [ ] PDF extraction: extract text/dimensions from PDF (pdf-lib or external API)
- [ ] Optional: manual dimension form for key values if PDF parse fails
- [ ] File storage: S3-compatible (MinIO/S3) instead of local disk
- [ ] Report export: generate PDF or HTML summary
- [ ] Clear disclaimer on every report: "Mögliche Verstöße – keine rechtliche Bewertung"

## Phase 3: Multi-format & regulations

- [ ] IFC support: parser or library to map IFC to PlanElements
- [ ] DWG: integration with converter service or API
- [ ] Rule configuration: store rules or parameters per project/Bundesland (e.g. max escape route length by state)
- [ ] More rules: ceiling height, room count vs. exits, etc.

## Phase 4: AI and scale

- [ ] **AI plan parsing**: CV/ML to detect walls, doors, dimensions from raster or vector PDF/DWG
- [ ] **AI-assisted suggestions**: LLM to suggest fix descriptions or regulation summaries
- [ ] **Pre-submission workflow**: "Permit pre-check" mode with checklist and export for authorities
- [ ] Teams/organizations and role-based access
- [ ] Audit log for runs and exports

## Out of scope for MVP

- Legal certainty or certification of compliance
- Full IFC/DWG editing
- Real-time collaboration on plans
- Mobile app (responsive web first)
