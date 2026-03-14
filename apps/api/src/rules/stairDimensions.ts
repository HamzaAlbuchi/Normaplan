import type { Rule } from "./types.js";
import { VALID_STATE_CODES } from "../plzToState.js";

const MIN_TREAD_DEPTH_M = 0.26;
const MAX_RISER_HEIGHT_M = 0.2;
const MIN_STAIR_WIDTH_M = 1.0;

export const stairDimensions: Rule = {
  id: "stair_dimensions",
  name: "Treppenmaße",
  description: "Stufenfläche (Auftritt) und Steigung müssen im zulässigen Bereich liegen.",
  category: "stairs",
  regulationRef: "DIN 18065",
  applicableStates: VALID_STATE_CODES,
  check(elements) {
    const violations: ReturnType<Rule["check"]> = [];
    for (const stair of elements.stairs) {
      if (stair.treadDepthM != null && stair.treadDepthM < MIN_TREAD_DEPTH_M) {
        violations.push({
          ruleId: "stair_dimensions",
          ruleName: "Treppenmaße – Auftritt",
          severity: "error",
          message: `Treppe "${stair.id}": Auftritt ${(stair.treadDepthM * 100).toFixed(0)} cm. Mindestauftritt nach DIN 18065: ${MIN_TREAD_DEPTH_M * 100} cm.`,
          suggestion: `Auftritt auf mindestens ${MIN_TREAD_DEPTH_M * 100} cm vergrößern.`,
          elementIds: [stair.id],
          actualValue: stair.treadDepthM,
          requiredValue: MIN_TREAD_DEPTH_M,
          regulationRef: "DIN 18065",
        });
      }
      if (stair.riserHeightM != null && stair.riserHeightM > MAX_RISER_HEIGHT_M) {
        violations.push({
          ruleId: "stair_dimensions",
          ruleName: "Treppenmaße – Steigung",
          severity: "error",
          message: `Treppe "${stair.id}": Steigung ${(stair.riserHeightM * 100).toFixed(0)} cm. Maximal zulässige Steigung nach DIN 18065: ${MAX_RISER_HEIGHT_M * 100} cm.`,
          suggestion: `Steigung auf maximal ${MAX_RISER_HEIGHT_M * 100} cm reduzieren.`,
          elementIds: [stair.id],
          actualValue: stair.riserHeightM,
          requiredValue: MAX_RISER_HEIGHT_M,
          regulationRef: "DIN 18065",
        });
      }
      if (stair.widthM != null && stair.widthM < MIN_STAIR_WIDTH_M) {
        violations.push({
          ruleId: "stair_dimensions",
          ruleName: "Treppenmaße – Breite",
          severity: "warning",
          message: `Treppe "${stair.id}": Breite ${(stair.widthM * 100).toFixed(0)} cm. Übliche Mindestbreite Rettungstreppe: ${MIN_STAIR_WIDTH_M * 100} cm.`,
          suggestion: `Treppenbreite prüfen; mindestens ${MIN_STAIR_WIDTH_M} m für Rettungsweg empfohlen.`,
          elementIds: [stair.id],
          actualValue: stair.widthM,
          requiredValue: MIN_STAIR_WIDTH_M,
          regulationRef: "DIN 18065",
        });
      }
    }
    return violations;
  },
};
