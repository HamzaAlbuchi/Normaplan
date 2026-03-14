import type { Rule } from "./types.js";

const MAX_ESCAPE_ROUTE_LENGTH_M = 35;

export const escapeRouteLength: Rule = {
  id: "escape_route_length",
  name: "Länge Rettungsweg",
  description: "Die Länge des Rettungswegs in eine Richtung darf bestimmte Maße nicht überschreiten.",
  category: "escape",
  regulationRef: "MBO §33, Landesbauordnungen",
  check(elements) {
    const violations: ReturnType<Rule["check"]> = [];
    for (const route of elements.escapeRoutes) {
      if (route.lengthM > MAX_ESCAPE_ROUTE_LENGTH_M) {
        violations.push({
          ruleId: "escape_route_length",
          ruleName: "Länge Rettungsweg",
          severity: "error",
          message: `Rettungsweg "${route.id}": ${route.lengthM.toFixed(1)} m. Mögliche Überschreitung der zulässigen Länge (Referenzwert ${MAX_ESCAPE_ROUTE_LENGTH_M} m).`,
          suggestion: `Rettungsweg verkürzen oder zweiten Rettungsweg prüfen. Gebäudeklasse und Landesvorschriften beachten.`,
          elementIds: [route.id],
          actualValue: route.lengthM,
          requiredValue: MAX_ESCAPE_ROUTE_LENGTH_M,
          regulationRef: "MBO §33",
        });
      }
    }
    return violations;
  },
};
