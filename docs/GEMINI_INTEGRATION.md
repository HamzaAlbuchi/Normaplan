# Gemini Integration for PDF Analysis

## Overview

Integration of Google Gemini API to:
1. **Analyze PDF floor plans** and extract structured plan elements (rooms, doors, corridors, etc.) as JSON
2. **Optionally return AI-detected violations** for additional context
3. **Use project context** (PLZ, building type, etc.) for rule-relevant extraction

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  PDF Upload │────▶│  Gemini Parser   │────▶│  PlanElements   │
│  + Project  │     │  (with context)  │     │  (JSON)         │
│  Context    │     └──────────────────┘     └────────┬────────┘
└─────────────┘              │                        │
                             │                        │
                             ▼                        ▼
                    ┌─────────────────┐     ┌─────────────────┐
                    │  AI Violations  │     │  Rule Engine    │
                    │  (optional)     │     │  (declarative)  │
                    └────────┬────────┘     └────────┬────────┘
                             │                        │
                             └────────────┬───────────┘
                                          ▼
                                 ┌─────────────────┐
                                 │  Merged Report  │
                                 │  (AI + Rules)   │
                                 └─────────────────┘
```

## Project Context (for Gemini)

Pass to Gemini so it can tailor extraction and violation checks:

| Field | Source | Purpose |
|-------|--------|---------|
| `zipCode` | Project.zipCode | Bundesland (state) for jurisdiction-specific rules |
| `state` | Project.state (derived from PLZ) | e.g. BY, BW, BE |
| `projectType` | Project.projectType | residential, commercial, etc. – affects applicable rules |
| `buildingType` | Optional | e.g. "Mehrfamilienhaus", "Sonderbau" |

## Implementation Plan

### 1. Environment & Config

- Add `GEMINI_API_KEY` to `.env`
- Add config in `apps/api/src/config.ts`

### 2. Gemini Parser Service

Create `apps/api/src/parser/geminiParser.ts`:

- Accept: `Buffer` (PDF), `ProjectContext` (zipCode, state, projectType)
- Call Gemini with:
  - PDF as inline base64
  - System prompt describing the PlanElements JSON schema
  - User prompt including project context
- Parse Gemini response to extract PlanElements JSON
- Optionally parse a second "violations" section

### 3. Prompt Design

**System prompt** (German):
- Describe the PlanElements JSON structure
- List required fields (rooms, corridors, doors, windows, stairs, escapeRoutes)
- Ask for valid JSON only, no markdown

**User prompt** (with context):
```
Analysiere diesen Grundriss-PDF und extrahiere die Plan-Elemente als JSON.

Projektkontext:
- PLZ: {{zipCode}}
- Bundesland: {{state}}
- Gebäudetyp: {{projectType}}

Erstelle ein JSON-Objekt mit: rooms, corridors, doors, windows, stairs, escapeRoutes.
Alle Maße in Metern. IDs eindeutig (z.B. room-1, door-1).
```

### 4. Optional: AI Violations

Add a second prompt or follow-up:
```
Basierend auf dem extrahierten Plan und den deutschen Bauvorschriften (MBO, DIN, LBO):
Liste mögliche Verstöße mit: ruleId, severity, message, elementIds.
```

### 5. Plan Upload Flow

**Option A: Replace PDF parser**
- When `GEMINI_API_KEY` is set, use Gemini instead of pdf-parse for PDF extraction
- Fallback to pdf-parse if Gemini fails

**Option B: New endpoint**
- `POST /api/plans/upload-with-gemini` – explicitly use Gemini

**Option C: Hybrid**
- Upload stores PDF; extraction runs async
- `POST /api/plans/:planId/extract` – trigger Gemini extraction with project context

### 6. Merging AI Violations ✅ Implemented

When `GEMINI_API_KEY` is set and user runs a check:
- Declarative rules run first
- Gemini is called with PlanElements + project context to detect violations
- AI violations are stored with `ruleId: "ai-gemini-*"`
- Merged with declarative violations in the same run
- UI shows "AI" badge for violations from Gemini (transparency)

## API Changes

### Plan Upload (extended)

```javascript
// POST /api/plans/upload
// Multipart: projectId, name, file
// If file is PDF and GEMINI_API_KEY set:
//   - Load project from DB (zipCode, state, projectType)
//   - Call Gemini with PDF + context
//   - Store elementsJson from Gemini response
```

### Project Context (already available)

- `project.zipCode` (from project)
- `project.state` (derived from PLZ)
- `project.projectType` (residential, commercial, etc.)

## Dependencies

```bash
pnpm add @google/genai --filter api
```

The `@google/genai` package is already added to `apps/api/package.json`. Run `pnpm install` from the repo root if needed.

## Security & Privacy

- **API key**: Store in env, never in client
- **PDF content**: Sent to Google; ensure data processing terms are acceptable
- **Rate limits**: Gemini has quotas; consider caching or retry logic

## Cost Considerations

- Gemini: pay-per-token; PDFs can be large
- Consider: Gemini 1.5 Flash (cheaper) vs Pro (more accurate)
- Use Files API for large PDFs to avoid repeated uploads
