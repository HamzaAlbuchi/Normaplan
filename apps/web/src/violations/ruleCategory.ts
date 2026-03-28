import type { ViolationListItem } from "../api/client";

/** Short category labels for filters / UI (not verbose DB rule names). */
export const RULE_TYPE_OPTIONS = [
  { value: "", label: "All rule types" },
  { value: "window_area", label: "Window area" },
  { value: "door_width", label: "Door width" },
  { value: "escape_route", label: "Escape route" },
  { value: "stair_dimensions", label: "Stair dimensions" },
  { value: "corridor_width", label: "Corridor width" },
  { value: "other", label: "Other" },
] as const;

export type RuleCategoryKey = (typeof RULE_TYPE_OPTIONS)[number]["value"];

const norm = (s: string) => s.toLowerCase();

function scoreKeywords(text: string, words: string[]): number {
  const t = norm(text);
  let s = 0;
  for (const w of words) {
    if (t.includes(w)) s += 1;
  }
  return s;
}

/**
 * Maps a violation to a short category key for filtering and display.
 */
export function violationRuleCategory(v: ViolationListItem): Exclude<RuleCategoryKey, ""> {
  const blob = `${v.ruleId} ${v.ruleName} ${"title" in v && v.title ? v.title : ""}`;
  const scores: [Exclude<RuleCategoryKey, "">, number][] = [
    ["window_area", scoreKeywords(blob, ["window", "fenster", "fläche", "flaeche", "daylight", "taglicht"])],
    ["door_width", scoreKeywords(blob, ["door", "tür", "tuer", "opening", "width", "breite", "mindestbreite"])],
    ["escape_route", scoreKeywords(blob, ["escape", "flucht", "rettungs", "rescue", "exit"])],
    ["stair_dimensions", scoreKeywords(blob, ["stair", "treppe", "stufen", "geländer", "step"])],
    ["corridor_width", scoreKeywords(blob, ["corridor", "flur", "gang", "passage", "flurbreite"])],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  if (scores[0][1] > 0) return scores[0][0];
  return "other";
}

export function shortCategoryLabel(v: ViolationListItem): string {
  const k = violationRuleCategory(v);
  const opt = RULE_TYPE_OPTIONS.find((o) => o.value === k);
  return opt?.label ?? "Other";
}
