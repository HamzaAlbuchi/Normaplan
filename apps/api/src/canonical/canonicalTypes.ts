/**
 * Canonical finding model – normalized structure for merged rule + AI findings.
 * Aligned with apps/web/src/findings/canonicalTypes.ts
 */

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

export type FindingSource = "RULE_BASED" | "AI_ASSISTED" | "AI_ONLY";

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
  primaryRawId: string;
  sourceCount: number;
}
