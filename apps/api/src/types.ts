/**
 * Minimal plan & rule types for API (no workspace dependency).
 * Extend later with full @baupilot/types when adding real rule engine.
 */

export interface Room {
  id: string;
  name?: string;
  areaM2: number;
  floorLevel?: number;
  windowAreaM2?: number;
  ceilingHeightM?: number;
}

export interface Corridor {
  id: string;
  widthM: number;
  lengthM?: number;
  floorLevel?: number;
}

export interface Door {
  id: string;
  widthM: number;
  accessible?: boolean;
  roomIds?: string[];
}

export interface Window {
  id: string;
  areaM2: number;
  roomId: string;
}

export interface Stair {
  id: string;
  treadDepthM?: number;
  riserHeightM?: number;
  widthM?: number;
  floorLevelFrom?: number;
  floorLevelTo?: number;
}

export interface EscapeRoute {
  id: string;
  lengthM: number;
  fromRoomId: string;
  toExitId: string;
  floorLevel?: number;
}

export interface PlanElements {
  rooms: Room[];
  corridors: Corridor[];
  doors: Door[];
  windows: Window[];
  stairs: Stair[];
  escapeRoutes: EscapeRoute[];
}

export type Severity = "warning" | "error" | "info";

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  suggestion?: string;
  elementIds: string[];
  actualValue?: number;
  requiredValue?: number;
  regulationRef?: string;
}
