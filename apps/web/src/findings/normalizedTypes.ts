/**
 * Mapping from rule IDs and AI keywords to normalized finding types.
 */

import type { NormalizedFindingType } from "./canonicalTypes";

/** Rule ID -> normalized type (deterministic). */
export const RULE_ID_TO_NORMALIZED_TYPE: Record<string, NormalizedFindingType> = {
  door_width_accessible: "DOOR_WIDTH_TOO_SMALL",
  window_area_ratio: "INSUFFICIENT_DAYLIGHT",
  room_height_living: "ROOM_HEIGHT",
  parapet_height_low_window: "INSUFFICIENT_DAYLIGHT",
  bathroom_ventilation: "MISSING_VENTILATION",
  kitchen_ventilation: "MISSING_VENTILATION",
  trash_area_ventilation: "MISSING_VENTILATION",
  ventilation_concept: "MISSING_VENTILATION",
  corridor_width: "ESCAPE_ROUTE_RISK",
  rescue_window_size: "ESCAPE_ROUTE_RISK",
  dead_end_corridor: "ESCAPE_ROUTE_RISK",
  fire_truck_access: "ESCAPE_ROUTE_RISK",
  turning_circle_bathroom: "ACCESSIBILITY_NON_COMPLIANCE",
  lift_cabin_size: "ACCESSIBILITY_NON_COMPLIANCE",
  lift_waiting_area: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_door_handle_height: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_threshold_height: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_corridor_turning_space: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_shower_size: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_wc_distance_wall: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_washbasin_legroom: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_ramp_slope: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_ramp_landing_length: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_balcony_depth: "ACCESSIBILITY_NON_COMPLIANCE",
  acc_kitchen_aisle_width: "ACCESSIBILITY_NON_COMPLIANCE",
  fire_door_boiler_room: "FIRE_SAFETY",
  fire_wall_distance: "FIRE_SAFETY",
  smoke_extraction_stairwell: "FIRE_SAFETY",
  apartment_entrance_fire_rating: "FIRE_SAFETY",
  basement_stair_separation: "FIRE_SAFETY",
  smoke_detector_requirement: "FIRE_SAFETY",
  stair_tread_ratio: "STAIR_GEOMETRY",
  stair_headroom: "STAIR_GEOMETRY",
  landing_depth: "STAIR_GEOMETRY",
  handrail_continuity: "STAIR_GEOMETRY",
  balcony_railing_height: "OTHER",
  emergency_light_requirement: "OTHER",
  storage_space_min: "OTHER",
  plan_grz_limit: "OTHER",
  plan_gfz_limit: "OTHER",
  bicycle_parking_count: "OTHER",
  playground_requirement: "OTHER",
  basement_height_clear: "OTHER",
  roof_pv_readiness: "OTHER",
  sound_insulation_walls: "OTHER",
  sound_insulation_floors: "OTHER",
  bathroom_wall_tiles: "OTHER",
  slope_room_height_calc: "OTHER",
  entrance_protection: "OTHER",
  balcony_threshold_height: "OTHER",
};

/** AI keyword patterns -> normalized type (for inferring from ruleName/message). */
const AI_KEYWORD_PATTERNS: { pattern: RegExp; type: NormalizedFindingType }[] = [
  { pattern: /tür|door|breite|width|lichte/i, type: "DOOR_WIDTH_TOO_SMALL" },
  { pattern: /belichtung|daylight|fenster|window|tageslicht/i, type: "INSUFFICIENT_DAYLIGHT" },
  { pattern: /lüftung|ventilation|entlüftung|fensterlos/i, type: "MISSING_VENTILATION" },
  { pattern: /rettungsweg|flur|korridor|escape|rettungsfenster|stichflur/i, type: "ESCAPE_ROUTE_RISK" },
  { pattern: /barrierefrei|rollstuhl|accessibility|wendekreis|rampe/i, type: "ACCESSIBILITY_NON_COMPLIANCE" },
  { pattern: /brandschutz|feuer|rauch|smoke|t30|f90/i, type: "FIRE_SAFETY" },
  { pattern: /treppe|stair|podest|handlauf|steigung|auftritt/i, type: "STAIR_GEOMETRY" },
  { pattern: /raumhöhe|ceiling|lichte höhe/i, type: "ROOM_HEIGHT" },
];

export function inferNormalizedTypeFromAi(ruleName: string, message: string): NormalizedFindingType {
  const text = `${ruleName} ${message}`.toLowerCase();
  for (const { pattern, type } of AI_KEYWORD_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return "OTHER";
}
