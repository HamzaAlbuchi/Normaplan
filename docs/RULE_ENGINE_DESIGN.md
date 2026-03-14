# Rule Engine Design

## Purpose

The rule engine takes **plan elements** (a normalized, format-agnostic model) and returns **possible violations**. It is:

- **Stateless and pure**: no DB or API calls inside rules.
- **Pluggable**: rules are registered in `packages/rule-engine/src/rules/index.ts`; later they can be loaded from config or DB per Bundesland.
- **Testable**: each rule is a function `(elements: PlanElements) => RuleViolation[]`.

## Plan model (input)

Defined in `@baupilot/types`. All parsers (JSON mock, future PDF/IFC/DWG) must produce this shape:

- **rooms**: id, areaM2, windowAreaM2, etc.
- **corridors**: id, widthM, lengthM
- **doors**: id, widthM, accessible?
- **windows**: id, areaM2, roomId
- **stairs**: id, treadDepthM, riserHeightM, widthM
- **escapeRoutes**: id, lengthM, fromRoomId, toExitId

## Rule contract

Each rule implements:

```ts
interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  regulationRef?: string;
  check: (elements: PlanElements) => RuleViolation[];
}
```

- **Severity**: `error` (likely non-compliant), `warning` (e.g. accessibility), `info`.
- **Message**: Short German text for the architect.
- **Suggestion**: Optional fix suggestion.
- **elementIds**: Affected element ids for highlighting in the UI.
- **actualValue / requiredValue**: For numeric rules (e.g. width in m).
- **regulationRef**: e.g. "DIN 18065", "MBO §33".

## Language and liability

- All messages use **“mögliche Verstoß” / “possible violation”** wording.
- The report and export must state that the result is **not legal certainty** and does not replace official approval.

## Extensibility

- **More rules**: Add a new file in `packages/rule-engine/src/rules/` and register it.
- **Per-region rules**: Later, the API can pass `ruleIds` or a region code; the engine can filter or load a rule set from config.
- **Parameters**: Rule constants (e.g. min corridor width) can be moved to a config object or DB later.
