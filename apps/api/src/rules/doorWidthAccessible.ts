import type { Rule } from "./types.js";
import { VALID_STATE_CODES } from "../plzToState.js";

const MIN_ACCESSIBLE_DOOR_WIDTH_M = 0.9;

export const doorWidthAccessible: Rule = {
  id: "door_width_accessible",
  name: "Türbreite barrierefrei",
  description: "Türen in barrierefreien Bereichen müssen eine lichte Durchgangsbreite von mindestens 90 cm haben.",
  category: "accessibility",
  regulationRef: "DIN 18040-2",
  applicableStates: VALID_STATE_CODES,
  check(elements) {
    const violations: ReturnType<Rule["check"]> = [];
    for (const d of elements.doors) {
      if (d.accessible !== false) {
        if (d.widthM < MIN_ACCESSIBLE_DOOR_WIDTH_M) {
          violations.push({
            ruleId: "door_width_accessible",
            ruleName: "Türbreite barrierefrei",
            severity: "warning",
            message: `Mögliche Unterschreitung: Tür "${d.id}" hat Breite ${(d.widthM * 100).toFixed(0)} cm. Für Barrierefreiheit mindestens ${MIN_ACCESSIBLE_DOOR_WIDTH_M * 100} cm lichte Breite.`,
            suggestion: `Tür auf mindestens ${MIN_ACCESSIBLE_DOOR_WIDTH_M} m (90 cm) lichte Durchgangsbreite vergrößern oder als nicht barrierefrei kennzeichnen.`,
            elementIds: [d.id],
            actualValue: d.widthM,
            requiredValue: MIN_ACCESSIBLE_DOOR_WIDTH_M,
            regulationRef: "DIN 18040-2",
          });
        }
      }
    }
    return violations;
  },
};
