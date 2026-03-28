import type { NormalizedFinding } from "./canonicalTypes.js";
import type { ViolationLike } from "./violationLike.js";
import { inferNormalizedTypeFromAi, RULE_ID_TO_NORMALIZED_TYPE } from "./normalizedTypes.js";
import { isAiViolation } from "./categoryForRule.js";

function extractRoomIds(elementIds: string[]): string[] {
  return elementIds.filter((id) => id.startsWith("room-") || id.includes("-room-"));
}

export function normalizeViolation(v: ViolationLike): NormalizedFinding {
  const elementIds = Array.isArray(v.elementIds) ? v.elementIds : [];
  const isAi = isAiViolation(v);

  const normalizedType = isAi
    ? inferNormalizedTypeFromAi(v.ruleName ?? "", v.message ?? "")
    : (RULE_ID_TO_NORMALIZED_TYPE[v.ruleId ?? ""] ?? "OTHER");

  return {
    rawId: v.id ?? `raw-${v.ruleId}-${elementIds.join("-")}`,
    rawRuleId: v.ruleId ?? "",
    rawRuleName: v.ruleName ?? "",
    normalizedType,
    severity: v.severity ?? "info",
    message: v.message ?? "",
    suggestion: v.suggestion ?? undefined,
    regulationRef: v.regulationRef ?? undefined,
    elementIds,
    roomIds: extractRoomIds(elementIds),
    measuredValue: v.actualValue ?? undefined,
    requiredValue: v.requiredValue ?? undefined,
    source: isAi ? "ai" : "rule",
  };
}

export function normalizeViolations(violations: ViolationLike[]): NormalizedFinding[] {
  return violations.map(normalizeViolation);
}
