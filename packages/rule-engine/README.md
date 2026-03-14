# @baupilot/rule-engine

Pluggable rule engine for German building compliance checks. Runs on **plan elements** (rooms, corridors, doors, windows, stairs, escape routes) and returns a list of **possible violations** with severity, message, suggestion, and regulation reference.

## Usage

```ts
import { runRules } from "@baupilot/rule-engine";
import type { PlanElements } from "@baupilot/rule-engine";

const elements: PlanElements = {
  rooms: [...],
  corridors: [...],
  doors: [...],
  windows: [...],
  stairs: [...],
  escapeRoutes: [...],
};

const { violations, ruleVersion } = runRules(elements, {
  runId: "run-1",
  planId: "plan-1",
  // ruleIds: ["corridor_width", "door_width_accessible"], // optional: run only these
});
```

## Bundled rules (MVP)

| Id | Name | Category |
|----|------|----------|
| `corridor_width` | Mindestbreite Flur / Rettungsweg | escape |
| `door_width_accessible` | Türbreite barrierefrei | accessibility |
| `window_area_room` | Fensterfläche Aufenthaltsräume | daylight |
| `escape_route_length` | Länge Rettungsweg | escape |
| `stair_dimensions` | Treppenmaße | stairs |

## Adding a rule

1. Create `src/rules/myRule.ts` implementing `Rule` (see `src/rules/types.ts`).
2. Export a `check(elements: PlanElements): RuleViolation[]` function.
3. Register in `src/rules/index.ts`.

Rules are pure functions; no I/O. Design for testability and later loading from config/DB per Bundesland.
