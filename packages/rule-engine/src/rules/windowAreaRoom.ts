import type { Rule } from "./types.js";

/** Minimum ratio of window area to floor area for habitable rooms (e.g. 1/10). */
const MIN_WINDOW_RATIO = 1 / 10;

export const windowAreaRoom: Rule = {
  id: "window_area_room",
  name: "Fensterfläche Aufenthaltsräume",
  description: "Aufenthaltsräume müssen ausreichend Tageslichtöffnungen haben (z.B. mindestens 1/10 der Bodenfläche).",
  category: "daylight",
  regulationRef: "Landesbauordnungen (z.B. Lichtfläche)",
  check(elements) {
    const violations: ReturnType<Rule["check"]> = [];
    for (const room of elements.rooms) {
      const requiredWindowArea = room.areaM2 * MIN_WINDOW_RATIO;
      const actualWindowArea = room.windowAreaM2 ?? 0;
      if (actualWindowArea < requiredWindowArea && room.areaM2 > 0) {
        violations.push({
          ruleId: "window_area_room",
          ruleName: "Fensterfläche Aufenthaltsräume",
          severity: "warning",
          message: `Raum "${room.id}" (${room.areaM2.toFixed(1)} m²): Fensterfläche ${actualWindowArea.toFixed(2)} m². Empfohlen mindestens ${requiredWindowArea.toFixed(2)} m² (1/10 der Bodenfläche).`,
          suggestion: `Fensterfläche auf mindestens ${requiredWindowArea.toFixed(2)} m² erhöhen oder Raum als nicht Aufenthaltsraum kennzeichnen.`,
          elementIds: [room.id],
          actualValue: actualWindowArea,
          requiredValue: requiredWindowArea,
          regulationRef: "Landesbauordnungen",
        });
      }
    }
    return violations;
  },
};
