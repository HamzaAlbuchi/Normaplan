import type { Rule } from "./types.js";
import { VALID_STATE_CODES } from "../plzToState.js";

const MIN_WIDTH_M = 1.2;
const MIN_ACCESSIBLE_WIDTH_M = 1.5;

export const corridorWidth: Rule = {
  id: "corridor_width",
  name: "Mindestbreite Flur / Rettungsweg",
  description: "Flure und Rettungswege müssen eine Mindestbreite einhalten.",
  category: "escape",
  regulationRef: "MBO §33, DIN 18065",
  applicableStates: VALID_STATE_CODES,
  check(elements) {
    const violations: ReturnType<Rule["check"]> = [];
    for (const c of elements.corridors) {
      if (c.widthM < MIN_WIDTH_M) {
        violations.push({
          ruleId: "corridor_width",
          ruleName: "Mindestbreite Flur / Rettungsweg",
          severity: "error",
          message: `Mögliche Unterschreitung: Flur "${c.id}" hat Breite ${(c.widthM * 100).toFixed(0)} cm. Mindestbreite Rettungsweg: ${MIN_WIDTH_M * 100} cm.`,
          suggestion: `Flurbreite auf mindestens ${MIN_WIDTH_M} m (120 cm) vergrößern.`,
          elementIds: [c.id],
          actualValue: c.widthM,
          requiredValue: MIN_WIDTH_M,
          regulationRef: "MBO §33, DIN 18065",
        });
      } else if (c.widthM < MIN_ACCESSIBLE_WIDTH_M) {
        violations.push({
          ruleId: "corridor_width",
          ruleName: "Mindestbreite Flur (barrierefrei)",
          severity: "warning",
          message: `Flur "${c.id}": ${(c.widthM * 100).toFixed(0)} cm. Für Barrierefreiheit werden oft mindestens ${MIN_ACCESSIBLE_WIDTH_M * 100} cm empfohlen.`,
          suggestion: `Für barrierefreie Nutzung Breite auf mindestens ${MIN_ACCESSIBLE_WIDTH_M} m prüfen.`,
          elementIds: [c.id],
          actualValue: c.widthM,
          requiredValue: MIN_ACCESSIBLE_WIDTH_M,
          regulationRef: "DIN 18040-2",
        });
      }
    }
    return violations;
  },
};
