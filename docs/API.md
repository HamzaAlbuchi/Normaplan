# BauPilot API

Base path: `/api`. All authenticated routes require header: `Authorization: Bearer <token>`.

## Auth

### POST /api/auth/register

- Body: `{ "email": string, "password": string, "name"?: string }`
- Response: `{ "token": string, "user": { "id", "email", "name?" } }`

### POST /api/auth/login

- Body: `{ "email": string, "password": string }`
- Response: `{ "token": string, "user": { "id", "email", "name?" } }`

## Projects

### GET /api/projects

- Response: `[{ "id", "name", "createdAt", "planCount" }]`

### POST /api/projects

- Body: `{ "name": string }`
- Response: `{ "id", "name", "createdAt", "planCount" }`

### GET /api/projects/:projectId

- Response: `{ "id", "name", "createdAt", "planCount" }`

## Plans

### POST /api/plans/upload

- Content-Type: `multipart/form-data`
- Fields: `file` (File), `projectId` (string), `name`? (string)
- Accepted files: `.json` (plan elements), `.pdf` (stored only; extraction not implemented in MVP)
- Response: `{ "id", "projectId", "name", "fileName", "status", "createdAt", "extractionError"?: string }`

### GET /api/plans/:planId

- Response: `{ "id", "projectId", "name", "fileName", "status", "createdAt", "lastRunId"?, "elements"?, "extractionError"? }`

### GET /api/plans/project/:projectId

- Response: `[{ "id", "projectId", "name", "fileName", "status", "createdAt", "lastRunId"? }]`

## Runs

### POST /api/runs

- Body: `{ "planId": string }`
- Response: `{ "id", "planId", "checkedAt", "violationCount", "warningCount", "errorCount", "violations": Violation[] }`

### GET /api/runs/:runId

- Response: same as POST response.

## Violation shape

```ts
{
  "ruleId": string,
  "ruleName": string,
  "severity": "warning" | "error" | "info",
  "message": string,
  "suggestion"?: string,
  "elementIds": string[],
  "actualValue"?: number,
  "requiredValue"?: number,
  "regulationRef"?: string
}
```

## Errors

- `401`: Missing or invalid token.
- `400`: Validation error or missing body field; response body has `code` and `message`.
- `404`: Resource not found; `code`: `NOT_FOUND`.
