/**
 * Canonical finding model – normalized structure for merged rule + AI findings.
 */

/** Stable internal types for matching and deduplication. */
export type NormalizedFindingType =
  | "DOOR_WIDTH_TOO_SMALL"
  | "INSUFFICIENT_DAYLIGHT"
  | "MISSING_VENTILATION"
  | "ESCAPE_ROUTE_RISK"
  | "ACCESSIBILITY_NON_COMPLIANCE"
  | "FIRE_SAFETY"
  | "STAIR_GEOMETRY"
  | "ROOM_HEIGHT"
  | "OTHER";

/** Source of the finding. */
export type FindingSource = "RULE_BASED" | "AI_ASSISTED" | "AI_ONLY";

/** Display label for source badge. */
export const SOURCE_BADGE_LABELS: Record<FindingSource, string> = {
  RULE_BASED: "Regelbasiert",
  AI_ASSISTED: "AI-gestützt",
  AI_ONLY: "AI-only",
};

/** Normalized finding before merging (internal). */
export interface NormalizedFinding {
  rawId: string;
  rawRuleId: string;
  rawRuleName: string;
  normalizedType: NormalizedFindingType;
  severity: string;
  message: string;
  suggestion?: string;
  regulationRef?: string;
  elementIds: string[];
  roomIds: string[];
  measuredValue?: number;
  requiredValue?: number;
  source: "rule" | "ai";
}

/** Final canonical finding after merge. */
export interface CanonicalFinding {
  canonicalFindingId: string;
  normalizedType: NormalizedFindingType;
  category: string;
  severity: string;
  affectedElementIds: string[];
  affectedRoomIds: string[];
  measuredValue?: number;
  requiredValue?: number;
  reference?: string;
  title: string;
  description: string;
  suggestion?: string;
  primarySource: FindingSource;
  supportingSources: FindingSource[];
  confidence: number;
  rawSourceFindingIds: string[];
  /** For UI: first raw violation ID (for review actions) */
  primaryRawId: string;
  /** Count of merged source findings */
  sourceCount: number;
}
