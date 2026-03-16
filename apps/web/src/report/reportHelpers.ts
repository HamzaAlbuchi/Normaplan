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

/** German category labels for findings. */
export const CATEGORY_LABELS: Record<string, string> = {
  Barrierefreiheit: "Barrierefreiheit",
  Belichtung: "Belichtung",
  Lüftung: "Lüftung",
  Rettungsweg: "Rettungsweg",
  "Türen / Erschließung": "Türen / Erschließung",
  Brandschutz: "Brandschutz",
  Sicherheit: "Sicherheit",
  Planung: "Planung",
  Sonstige: "Sonstige",
};

/** Map ruleId to German category. AI rules default to Sonstige. */
const RULE_CATEGORY_MAP: Record<string, string> = {
  corridor_width: "Rettungsweg",
  rescue_window_size: "Rettungsweg",
  dead_end_corridor: "Rettungsweg",
  fire_truck_access: "Rettungsweg",
  window_area_ratio: "Belichtung",
  room_height_living: "Belichtung",
  parapet_height_low_window: "Belichtung",
  bathroom_ventilation: "Lüftung",
  kitchen_ventilation: "Lüftung",
  trash_area_ventilation: "Lüftung",
  ventilation_concept: "Lüftung",
  door_width_accessible: "Barrierefreiheit",
  turning_circle_bathroom: "Barrierefreiheit",
  lift_cabin_size: "Barrierefreiheit",
  lift_waiting_area: "Barrierefreiheit",
  acc_door_handle_height: "Barrierefreiheit",
  acc_threshold_height: "Barrierefreiheit",
  acc_corridor_turning_space: "Barrierefreiheit",
  acc_shower_size: "Barrierefreiheit",
  acc_wc_distance_wall: "Barrierefreiheit",
  acc_washbasin_legroom: "Barrierefreiheit",
  acc_ramp_slope: "Barrierefreiheit",
  acc_ramp_landing_length: "Barrierefreiheit",
  acc_balcony_depth: "Barrierefreiheit",
  acc_kitchen_aisle_width: "Barrierefreiheit",
  stair_tread_ratio: "Türen / Erschließung",
  stair_headroom: "Türen / Erschließung",
  landing_depth: "Türen / Erschließung",
  handrail_continuity: "Türen / Erschließung",
  entrance_protection: "Türen / Erschließung",
  balcony_threshold_height: "Türen / Erschließung",
  fire_door_boiler_room: "Brandschutz",
  fire_wall_distance: "Brandschutz",
  smoke_extraction_stairwell: "Brandschutz",
  apartment_entrance_fire_rating: "Brandschutz",
  basement_stair_separation: "Brandschutz",
  smoke_detector_requirement: "Brandschutz",
  balcony_railing_height: "Sicherheit",
  emergency_light_requirement: "Sicherheit",
  storage_space_min: "Planung",
  plan_grz_limit: "Planung",
  plan_gfz_limit: "Planung",
  bicycle_parking_count: "Planung",
  playground_requirement: "Planung",
  basement_height_clear: "Planung",
  roof_pv_readiness: "Planung",
  sound_insulation_walls: "Planung",
  sound_insulation_floors: "Planung",
  bathroom_wall_tiles: "Planung",
  slope_room_height_calc: "Planung",
};

export function getCategoryForRule(ruleId: string): string {
  if (ruleId?.startsWith("ai-gemini-")) return "Sonstige";
  return RULE_CATEGORY_MAP[ruleId ?? ""] ?? "Sonstige";
}

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
  category: string;
  elementIds: string[];
  /** Worst measured value in the group (e.g. smallest for "min width" rules) */
  worstActualValue?: number;
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
      if (v.actualValue != null) {
        if (existing.worstActualValue == null) existing.worstActualValue = v.actualValue;
        else if (v.actualValue < existing.worstActualValue) existing.worstActualValue = v.actualValue;
      }
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
        category: getCategoryForRule(v.ruleId ?? ""),
        elementIds: [...elementIds],
        worstActualValue: v.actualValue,
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
    const catCompare = (a.category ?? "").localeCompare(b.category ?? "");
    if (catCompare !== 0) return catCompare;
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

/** Build summary counts by category and severity for the executive summary table. */
export function getSummaryByCategoryAndSeverity(
  findings: GroupedFinding[]
): { category: string; error: number; warning: number; info: number }[] {
  const byCat = new Map<string, { error: number; warning: number; info: number }>();
  for (const f of findings) {
    const cat = f.category || "Sonstige";
    const row = byCat.get(cat) ?? { error: 0, warning: 0, info: 0 };
    if (f.severity === "error") row.error += f.count;
    else if (f.severity === "warning") row.warning += f.count;
    else row.info += f.count;
    byCat.set(cat, row);
  }
  const order = [
    "Rettungsweg",
    "Brandschutz",
    "Barrierefreiheit",
    "Belichtung",
    "Lüftung",
    "Türen / Erschließung",
    "Sicherheit",
    "Planung",
    "Sonstige",
  ];
  return order
    .filter((c) => byCat.has(c))
    .map((category) => ({
      category,
      ...byCat.get(category)!,
    }));
}

/** Derive 3 recommended next steps from top findings. */
export function getRecommendedNextSteps(findings: GroupedFinding[]): string[] {
  const steps: string[] = [];
  const seen = new Set<string>();
  for (const f of findings.slice(0, 5)) {
    const key = `${f.category}|${f.ruleId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const sev = f.severity === "error" ? "kritische" : f.severity === "warning" ? "wichtige" : "weitere";
    const cat = f.category === "Sonstige" ? "" : ` (${f.category})`;
    steps.push(`${sev.charAt(0).toUpperCase() + sev.slice(1)} Befunde prüfen${cat}: ${f.ruleName}`);
    if (steps.length >= 3) break;
  }
  while (steps.length < 3) {
    steps.push("Weitere Befunde im Detailteil prüfen.");
    if (steps.length >= 3) break;
  }
  return steps.slice(0, 3);
}
