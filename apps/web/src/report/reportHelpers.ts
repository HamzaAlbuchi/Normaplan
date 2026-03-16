/**
 * Report helpers for PDF export.
 * Transforms violation data for print-friendly presentation.
 */

import type { Violation } from "../api/client";

export const SEVERITY_ORDER = ["error", "warning", "info"] as const;
export const SEVERITY_LABELS: Record<string, string> = {
  error: "Kritisch",
  warning: "Warnung",
  info: "Hinweis",
};

export function isAiViolation(v: Violation): boolean {
  return v.ruleId?.startsWith("ai-gemini-") ?? false;
}

export function getSourceType(v: Violation): "Regelbasiert" | "KI-gestützt" {
  return isAiViolation(v) ? "KI-gestützt" : "Regelbasiert";
}

/** Sort violations: error first, then warning, then info. */
export function sortBySeverity(violations: Violation[]): Violation[] {
  return [...violations].sort((a, b) => {
    const ai = SEVERITY_ORDER.indexOf(a.severity as (typeof SEVERITY_ORDER)[number]);
    const bi = SEVERITY_ORDER.indexOf(b.severity as (typeof SEVERITY_ORDER)[number]);
    if (ai !== bi) return ai - bi;
    return (a.ruleName ?? "").localeCompare(b.ruleName ?? "");
  });
}

/** Group key for similar findings: same rule, message pattern, severity. */
function groupKey(v: Violation): string {
  const msg = (v.message ?? "").slice(0, 80);
  return `${v.ruleId ?? v.ruleName ?? ""}|${v.severity}|${msg}`;
}

export interface GroupedFinding {
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  suggestion?: string;
  regulationRef?: string;
  sourceType: "Regelbasiert" | "KI-gestützt";
  elementIds: string[];
  /** For grouped: sample actual/required if present */
  actualValue?: number;
  requiredValue?: number;
  /** Count of original violations merged */
  count: number;
}

/**
 * Group repeated findings of the same type into a single entry.
 * Example: 5 rescue window issues → 1 grouped finding with 5 element IDs.
 */
export function groupSimilarFindings(violations: Violation[]): GroupedFinding[] {
  const byKey = new Map<string, GroupedFinding>();

  for (const v of violations) {
    const key = groupKey(v);
    const existing = byKey.get(key);
    const elementIds = Array.isArray(v.elementIds) ? v.elementIds : [];

    if (existing) {
      existing.elementIds = [...new Set([...existing.elementIds, ...elementIds])];
      existing.count += 1;
      if (v.actualValue != null && existing.actualValue == null) existing.actualValue = v.actualValue;
      if (v.requiredValue != null && existing.requiredValue == null) existing.requiredValue = v.requiredValue;
    } else {
      byKey.set(key, {
        ruleId: v.ruleId ?? "",
        ruleName: v.ruleName ?? "",
        severity: v.severity ?? "info",
        message: v.message ?? "",
        suggestion: v.suggestion,
        regulationRef: v.regulationRef,
        sourceType: getSourceType(v),
        elementIds: [...elementIds],
        actualValue: v.actualValue,
        requiredValue: v.requiredValue,
        count: 1,
      });
    }
  }

  const result = Array.from(byKey.values());
  return result.sort((a, b) => {
    const ai = SEVERITY_ORDER.indexOf(a.severity as (typeof SEVERITY_ORDER)[number]);
    const bi = SEVERITY_ORDER.indexOf(b.severity as (typeof SEVERITY_ORDER)[number]);
    if (ai !== bi) return ai - bi;
    return (a.ruleName ?? "").localeCompare(b.ruleName ?? "");
  });
}

/** Top 3 priority findings: errors first, then warnings, then by count. */
export function getTopPriorityFindings(
  violations: Violation[],
  limit = 3
): GroupedFinding[] {
  const grouped = groupSimilarFindings(violations);
  return grouped.slice(0, limit);
}
