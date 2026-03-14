# Violations View – Architecture Overview

**Implementation status:** Complete. Backend uses Fastify (not NestJS).

## 1. Feature Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VIOLATIONS WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Data flow: RuleRun → RuleViolation → ViolationReview (audit)            │
│  Access: listAccessibleProjectIds() → violations in those projects        │
│  Views: Manager (all org) | Architect (assigned projects) | Reviewer     │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  Dashboard   │    │  Violations      │    │  Project / Plan      │
│  (summary)   │───▶│  (dedicated)     │◀───│  (embedded list)    │
└──────────────┘    └──────────────────┘    └─────────────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │  Violation       │
                    │  Detail Drawer   │
                    │  + Action Modal  │
                    └──────────────────┘
```

**Key decisions:**
- Violations remain tied to RuleRun/Plan/Project (no standalone entity)
- List API aggregates across accessible projects
- Confirm/Resolve = simple status change; Dismiss/Defer = require reason + audit
- Severity mapping: `error` → `critical` in API responses

---

## 2. Prisma Schema Updates

**Existing:** RuleViolation, ViolationReview already support status, reason, comment, decidedBy, decidedAt.

**Add:**
- `updatedAt` on RuleViolation (for "updated at" display)
- Optional `title` (nullable, derived from ruleName if null)

---

## 3. Backend Structure (Fastify)

```
apps/api/src/
├── routes/
│   └── violations.ts     # extend: GET / (list+filter), PATCH /:id (confirm|dismiss|defer|resolve)
├── constants/
│   └── reviewReasons.ts # already exists
└── rbac.ts              # canReviewViolations, listAccessibleProjectIds
```

---

## 4. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/violations | List violations (filter, sort, paginate) |
| GET | /api/violations/:id | Get single violation with context |
| PATCH | /api/violations/:id | Update status (confirm, dismiss, defer, resolve) |
| GET | /api/violations/:id/history | Audit trail (existing) |
| GET | /api/projects/:id/violations | Project-scoped list (optional) |

**Query params for GET /violations:**
- status, severity, projectId, ruleId, reviewedBy (decidedByUserId)
- sort: detectedAt|updatedAt, order: asc|desc
- limit, offset

---

## 5. Frontend Structure

```
apps/web/src/
├── screens/
│   └── Violations.tsx       # Main list + filters + quick views
├── components/
│   ├── ViolationCard.tsx    # List item (reusable)
│   ├── ViolationDetailDrawer.tsx
│   ├── ViolationActionModal.tsx  # confirm/dismiss/defer/resolve
│   └── ViolationFilters.tsx
├── App.tsx                  # route /violations
└── components/Layout.tsx    # nav link "Verstöße"
```

---

## 6. Implementation Summary

- **Backend:** `GET /api/violations` (list+filter), `GET /api/violations/:id`, `PATCH /api/violations/:id` (confirm|dismiss|defer|resolve), `GET /api/violations/:id/history`
- **Frontend:** `/violations` page, ViolationDetailDrawer, ViolationActionModal, filters, quick views
- **Project link:** "Verstöße anzeigen" → `/violations?projectId=xxx`

## 7. Notes on Future Improvements

- Bulk actions (dismiss multiple)
- Export to CSV/PDF
- Notifications on new critical issues
