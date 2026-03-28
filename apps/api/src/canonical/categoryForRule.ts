import type { ViolationLike } from "./violationLike.js";

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

export function isAiViolation(v: ViolationLike): boolean {
  return v.ruleId?.startsWith("ai-gemini-") ?? false;
}

export function getSourceType(v: ViolationLike): "Regelbasiert" | "KI-gestützt" {
  return isAiViolation(v) ? "KI-gestützt" : "Regelbasiert";
}
