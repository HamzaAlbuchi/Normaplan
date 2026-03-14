/**
 * Shared types and API contracts for BauPilot.
 * Used by api, web, and rule-engine.
 */

// ----- Plan model (format-agnostic; output of any parser) -----

export type PlanElementKind =
  | "room"
  | "corridor"
  | "door"
  | "window"
  | "stair"
  | "escape_route"
  | "opening";

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
  accessible?: boolean; // barrierefrei
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

// ----- Rule engine -----

export type Severity = "warning" | "error" | "info";

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  /** Human-readable suggestion */
  suggestion?: string;
  /** Affected element ids for highlighting */
  elementIds: string[];
  /** Optional numeric value that failed (e.g. width in m) */
  actualValue?: number;
  /** Required or recommended value */
  requiredValue?: number;
  /** Reference to regulation (e.g. DIN, state norm) */
  regulationRef?: string;
}

export interface RuleRunResult {
  runId: string;
  planId: string;
  violations: RuleViolation[];
  checkedAt: string; // ISO datetime
  ruleVersion?: string;
}

// ----- API contracts -----

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: { id: string; email: string; name?: string };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  planCount: number;
}

export interface PlanSummary {
  id: string;
  projectId: string;
  name: string;
  fileName: string;
  status: "uploaded" | "extracting" | "ready" | "failed";
  createdAt: string;
  lastRunId?: string;
}

export interface PlanDetail extends PlanSummary {
  elements?: PlanElements;
  extractionError?: string;
}

export interface RunSummary {
  id: string;
  planId: string;
  checkedAt: string;
  violationCount: number;
  warningCount: number;
  errorCount: number;
}

export interface RunDetail extends RunSummary {
  violations: RuleViolation[];
}

export interface ExportFormat {
  format: "pdf" | "html";
}
