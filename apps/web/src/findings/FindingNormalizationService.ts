/**
 * FindingNormalizationService – maps raw Violations to NormalizedFindings.
 */

import type { Violation } from "../api/client";
import type { NormalizedFinding } from "./canonicalTypes";
import { RULE_ID_TO_NORMALIZED_TYPE } from "./normalizedTypes";
import { inferNormalizedTypeFromAi } from "./normalizedTypes";
import { getCategoryForRule } from "../report/reportHelpers";

function extractRoomIds(elementIds: string[]): string[] {
  return elementIds.filter((id) => id.startsWith("room-") || id.includes("-room-"));
}

export function normalizeViolation(v: Violation): NormalizedFinding {
  const elementIds = Array.isArray(v.elementIds) ? v.elementIds : [];
  const isAi = v.ruleId?.startsWith("ai-gemini-") ?? false;

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
    suggestion: v.suggestion,
    regulationRef: v.regulationRef,
    elementIds,
    roomIds: extractRoomIds(elementIds),
    measuredValue: v.actualValue,
    requiredValue: v.requiredValue,
    source: isAi ? "ai" : "rule",
  };
}

export function normalizeViolations(violations: Violation[]): NormalizedFinding[] {
  return violations.map(normalizeViolation);
}
