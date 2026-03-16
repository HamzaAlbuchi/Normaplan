/**
 * Finding deduplication tests.
 */

import { describe, it, expect } from "vitest";
import { normalizeViolation } from "./FindingNormalizationService";
import { deduplicateFindings } from "./FindingDeduplicationService";
import type { Violation } from "../api/client";

function makeViolation(overrides: Partial<Violation> & { id: string }): Violation {
  return {
    id: overrides.id,
    ruleId: overrides.ruleId ?? "door_width_accessible",
    ruleName: overrides.ruleName ?? "Barrierefreie Türbreite",
    severity: overrides.severity ?? "warning",
    message: overrides.message ?? "Tür zu schmal",
    elementIds: overrides.elementIds ?? ["door-1"],
    ...overrides,
  };
}

describe("FindingDeduplicationService", () => {
  it("same door-width issue from rule + AI -> merged into one finding", () => {
    const rule = makeViolation({
      id: "v1",
      ruleId: "door_width_accessible",
      ruleName: "Barrierefreie Türbreite",
      message: "Tür door-1: Breite 0.85m. Für Barrierefreiheit 0.90m nötig.",
      elementIds: ["door-1"],
      actualValue: 0.85,
      requiredValue: 0.9,
    });
    const ai = makeViolation({
      id: "v2",
      ruleId: "ai-gemini-1",
      ruleName: "Türbreite Barrierefreiheit",
      message: "Tür door-1 unterschreitet Mindestbreite für Rollstuhl.",
      elementIds: ["door-1"],
      actualValue: 0.85,
      requiredValue: 0.9,
    });

    const normalized = [normalizeViolation(rule), normalizeViolation(ai)];
    const canonical = deduplicateFindings(normalized);

    expect(canonical).toHaveLength(1);
    expect(canonical[0].primarySource).toBe("RULE_BASED");
    expect(canonical[0].supportingSources).toContain("AI_ASSISTED");
    expect(canonical[0].rawSourceFindingIds).toContain("v1");
    expect(canonical[0].rawSourceFindingIds).toContain("v2");
  });

  it("same daylight issue from rule + AI -> merged", () => {
    const rule = makeViolation({
      id: "v1",
      ruleId: "window_area_ratio",
      ruleName: "Belichtung",
      message: "Fensterfläche in room-1 beträgt nur 8%.",
      elementIds: ["room-1"],
    });
    const ai = makeViolation({
      id: "v2",
      ruleId: "ai-gemini-2",
      ruleName: "Unzureichende Belichtung",
      message: "Raum room-1 hat zu wenig Tageslicht.",
      elementIds: ["room-1"],
    });

    const canonical = deduplicateFindings([normalizeViolation(rule), normalizeViolation(ai)]);

    expect(canonical).toHaveLength(1);
    expect(canonical[0].primarySource).toBe("RULE_BASED");
  });

  it("similar wording but different elements -> not merged", () => {
    const rule = makeViolation({
      id: "v1",
      ruleId: "door_width_accessible",
      elementIds: ["door-1"],
    });
    const ai = makeViolation({
      id: "v2",
      ruleId: "ai-gemini-1",
      ruleName: "Türbreite",
      message: "Tür door-2 zu schmal für Barrierefreiheit.",
      elementIds: ["door-2"],
    });

    const canonical = deduplicateFindings([normalizeViolation(rule), normalizeViolation(ai)]);

    expect(canonical).toHaveLength(2);
  });

  it("AI-only issue remains visible", () => {
    const ai = makeViolation({
      id: "v1",
      ruleId: "ai-gemini-1",
      ruleName: "AI erkannte Abweichung",
      message: "Möglicher Verstoß gegen Bauvorschriften.",
      elementIds: ["room-1"],
    });

    const canonical = deduplicateFindings([normalizeViolation(ai)]);

    expect(canonical).toHaveLength(1);
    expect(canonical[0].primarySource).toBe("AI_ONLY");
    expect(canonical[0].supportingSources).toHaveLength(0);
  });

  it("rule-only issue remains visible", () => {
    const rule = makeViolation({
      id: "v1",
      ruleId: "corridor_width",
      ruleName: "Mindestbreite Flur",
      elementIds: ["corridor-1"],
    });

    const canonical = deduplicateFindings([normalizeViolation(rule)]);

    expect(canonical).toHaveLength(1);
    expect(canonical[0].primarySource).toBe("RULE_BASED");
    expect(canonical[0].supportingSources).toHaveLength(0);
  });
});
