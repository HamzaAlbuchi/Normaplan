# BauPilot Violations Architecture

## 1. Feature Architecture Overview

Violations are first-class workflow entities for compliance issue management in architecture offices. Each violation represents a possible non-compliance detected by rule checks on plans.

### Data Flow

```
Plan Upload → Rule Run → Violations Created
                ↓
User views Violations (global or project-scoped)
                ↓
Review actions: confirm | dismiss | defer | resolve
                ↓
ViolationReview audit entries
```

### Access Model

| Role      | Global Violations View | Project Violations | Can Review |
|-----------|------------------------|--------------------|------------|
| owner     | All org projects       | Yes                | Yes        |
| manager   | All org projects       | Yes                | Yes        |
| architect | Assigned projects only | Yes (assigned)     | Yes        |
| reviewer  | All org projects       | Yes                | Yes        |
| viewer    | All org projects       | Yes                | No         |

### Key Concepts

- **Violation** = one detected issue from a rule check (RuleViolation in DB)
- **Status** = open | confirmed | dismissed | deferred | resolved
- **Severity** = info | warning | critical (stored as error in DB)
- **Review** = status change with optional reason/comment, logged in ViolationReview

---

## 2. Prisma Schema

Current schema already supports the feature. Key models:

```prisma
model RuleViolation {
  id              String   @id @default(cuid())
  runId           String
  run             RuleRun  @relation(...)
  ruleId          String
  ruleName        String
  severity        String   // info | warning | error
  message         String
  suggestion      String?
  elementIds      String[]
  actualValue     Float?
  requiredValue   Float?
  regulationRef   String?
  status          String   @default("open")
  reason          String?
  comment         String?
  decidedByUserId String?
  decidedBy       User?    @relation(...)
  decidedAt       DateTime?
  updatedAt       DateTime @updatedAt
  reviewHistory   ViolationReview[]
}

model ViolationReview {
  id          String   @id @default(cuid())
  violationId String
  violation   RuleViolation @relation(...)
  fromStatus  String
  toStatus    String
  reason      String?
  comment     String?
  userId      String
  user        User     @relation(...)
  createdAt   DateTime @default(now())
}
```

**detectedAt** = `run.checkedAt` (no separate column needed).

---

## 3. Backend Structure (Fastify)

BauPilot uses Fastify, not NestJS. Structure:

```
apps/api/src/
├── index.ts              # App bootstrap, route registration
├── auth.ts               # JWT requireAuth
├── rbac.ts               # canReviewViolations, listAccessibleProjectIds
├── db.ts                 # Prisma client
├── config.ts
├── constants/
│   └── reviewReasons.ts  # DISMISS_REASONS, DEFER_REASONS
├── routes/
│   ├── violations.ts    # Violations CRUD + history
│   ├── runs.ts          # Creates violations via rule engine
│   └── ...
└── rules/
    └── index.ts         # runRules() → violations
```

---

## 4. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/violations` | List violations (filtered, paginated) |
| GET | `/api/violations/rule-types` | List distinct rule types (for filter dropdown) |
| GET | `/api/violations/:id` | Get single violation |
| PATCH | `/api/violations/:id` | Update status (confirm/dismiss/defer/resolve) |
| GET | `/api/violations/:id/history` | Get audit history |
| GET | `/api/projects/:id/violation-stats` | Project-level stats (total, openCount, criticalCount) |

### List Query Params

| Param | Type | Description |
|-------|------|--------------|
| status | string | open, confirmed, dismissed, deferred, resolved |
| severity | string | info, warning, error (critical → error) |
| projectId | string | Filter by project |
| ruleId | string | Filter by rule type |
| reviewedBy | string | Filter by reviewer userId |
| sort | string | detectedAt \| updatedAt |
| order | string | asc \| desc |
| limit | number | 1–100, default 50 |
| offset | number | Pagination |

### PATCH Body

```json
{
  "action": "confirm" | "dismiss" | "defer" | "resolve",
  "reason": "string (required for dismiss/defer)",
  "comment": "string (optional, max 2000)"
}
```

---

## 5. Frontend Structure

```
apps/web/src/
├── App.tsx                    # Routes: /violations
├── components/
│   ├── Layout.tsx             # Nav: Dashboard, Verstöße, Admin
│   ├── ViolationDetailDrawer.tsx   # Side panel with actions
│   ├── ViolationActionModal.tsx    # Dismiss/defer reason form
│   ├── HistoryModal.tsx            # Audit timeline
│   └── ui/                     # Button, Card, Badge, etc.
├── screens/
│   ├── Violations.tsx         # Dedicated violations list
│   ├── Project.tsx            # Project page + violations link
│   └── PlanReport.tsx         # Inline violations per plan
└── api/client.ts              # violationsApi
```

### Violations Page

- Quick views: Offene, Kritische, Zurückgestellt, Abgewiesen, Behoben, Meine Entscheidungen
- Filters: status, severity, project, sort
- List + detail drawer
- Action modal for dismiss/defer with required reason

### Project Page

- Link to `/violations?projectId=X`
- Button "Verstöße anzeigen"

---

## 6. Review Reasons

### Dismiss

- `false_positive` – Falscher Treffer
- `not_applicable` – Nicht anwendbar
- `extraction_error` – Extraktionsfehler
- `exception_case` – Ausnahmefall

### Defer

- `will_fix_later` – Wird später behoben
- `waiting_for_client_input` – Warte auf Angaben des Auftraggebers
- `waiting_for_consultant_input` – Warte auf Stellungnahme des Fachplaners
- `non_blocking_for_current_phase` – Für aktuelle Phase nicht relevant

---

## 7. Future Improvements

- **Rule type filter UI** – Dropdown of rule names from `/api/rules` or derived from violations
- **Bulk actions** – Dismiss/defer multiple violations
- **Export** – CSV/PDF of violations for compliance reports
- **Notifications** – Email when critical violations are detected
- **Due dates** – For deferred issues
- **Assignments** – Assign violation to architect for follow-up
