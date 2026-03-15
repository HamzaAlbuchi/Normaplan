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
  /** Alias for ceilingHeightM; used by declarative rules */
  heightM?: number;
  /** e.g. "bathroom", "living", "boiler" */
  roomType?: string;
  /** For accessibility: min diameter of maneuvering space (m) */
  maneuveringSpaceDiameterM?: number;
  /** Area under 1m height (sloped ceiling) – WoFlV */
  heightUnder1M?: number;
  /** Area between 1m and 2m height (sloped ceiling) – WoFlV */
  height1to2M?: number;
}

export interface Corridor {
  id: string;
  widthM: number;
  lengthM?: number;
  floorLevel?: number;
  /** Length of dead-end section (Stichflur) in m */
  deadEndLengthM?: number;
  /** Min turning circle diameter (m) for wheelchair */
  turningCircleM?: number;
}

export interface Door {
  id: string;
  widthM: number;
  /** Alias for widthM (lichte Durchgangsbreite) */
  clearWidthM?: number;
  accessible?: boolean;
  roomIds?: string[];
  /** e.g. "T30" for fire doors */
  fireRating?: string;
  /** True if door leads to boiler/heating room */
  leadsToBoilerRoom?: boolean;
  /** True if door is apartment entrance (Wohnungseingangstür) */
  isApartmentEntrance?: boolean;
  /** True if smoke-tight / self-closing (dichtschließend) */
  smokeTightness?: boolean;
  /** Handle height (m) for accessibility */
  handleHeightM?: number;
}

export interface Window {
  id: string;
  areaM2: number;
  roomId: string;
  /** Clear opening width (m) for rescue windows */
  clearOpeningWidthM?: number;
  /** Clear opening height (m) for rescue windows */
  clearOpeningHeightM?: number;
  /** Sill height (m) for parapet/fall protection */
  sillHeightM?: number;
}

export interface Stair {
  id: string;
  treadDepthM?: number;
  riserHeightM?: number;
  widthM?: number;
  floorLevelFrom?: number;
  floorLevelTo?: number;
  /** Lichte Durchgangshöhe (m) */
  headroomM?: number;
}

export interface EscapeRoute {
  id: string;
  lengthM: number;
  fromRoomId: string;
  toExitId: string;
  floorLevel?: number;
}

export interface Railing {
  id: string;
  heightM: number;
  /** e.g. "balcony", "stair" */
  type?: string;
}

export interface Wall {
  id: string;
  /** Distance to property boundary (m) */
  distanceToBoundaryM?: number;
}

export interface Stairwell {
  id: string;
  /** Smoke vent area (m²) */
  smokeVentAreaM2?: number;
  /** True if T30 door separates basement stair */
  hasBasementSeparationDoor?: boolean;
}

export interface Handrail {
  id: string;
  /** Stair id this handrail belongs to */
  stairId?: string;
  /** True if continuous across landings */
  isContinuous?: boolean;
}

export interface StairLanding {
  id: string;
  depthM: number;
  /** Width of the stair run (for min depth check) */
  stairWidthM?: number;
  stairId?: string;
}

export interface Building {
  id: string;
  /** True if high-rise (Hochhaus) */
  isHighRise?: boolean;
  /** Bicycle parking spots per dwelling unit */
  bicycleSpotsPerUnit?: number;
}

export interface Apartment {
  id: string;
  /** Total storage area (apartment + basement) in m² */
  storageAreaM2?: number;
}

export interface Kitchen {
  id: string;
  /** True if window or natural ventilation */
  hasNaturalVentilation?: boolean;
  /** Aisle width between counters (m) */
  aisleWidthM?: number;
}

export interface Shower {
  id: string;
  /** Waterproofing height (m) */
  waterproofingHeightM?: number;
  /** Floor area (m²) */
  areaM2?: number;
}

export interface Entrance {
  id: string;
  /** True if canopy/overhang present */
  hasCanopy?: boolean;
}

export interface BalconyDoor {
  id: string;
  /** Threshold height (m) */
  thresholdHeightM?: number;
}

export interface TrashRoom {
  id: string;
  /** True if mechanical ventilation */
  isMechanicallyVentilated?: boolean;
}

export interface Lift {
  id: string;
  cabinWidthM?: number;
  cabinDepthM?: number;
}

export interface LiftFoyer {
  id: string;
  /** Depth in front of lift door (m) */
  depthM?: number;
}

export interface Threshold {
  id: string;
  /** Height (m) */
  heightM?: number;
}

export interface Toilet {
  id: string;
  /** Side clearance left or right (m) for wheelchair transfer */
  sideClearanceLeftOrRightM?: number;
}

export interface Washbasin {
  id: string;
  /** True if underpassable for wheelchair */
  isUnderpassable?: boolean;
}

export interface Ramp {
  id: string;
  /** Slope in percent */
  slopePercent?: number;
  /** Length between landings (m) */
  lengthBetweenLandingsM?: number;
}

export interface Balcony {
  id: string;
  /** Depth (m) */
  depthM?: number;
}

export interface AccessRoad {
  id: string;
  widthM: number;
}

export interface Site {
  id: string;
  /** Calculated GRZ (Grundflächenzahl) */
  calculatedGRZ?: number;
  /** Calculated GFZ (Geschossflächenzahl) */
  calculatedGFZ?: number;
  /** Max GRZ from development plan (Bebauungsplan) */
  bPlanGRZ?: number;
  /** Max GFZ from development plan */
  bPlanGFZ?: number;
}

export interface PartitionWall {
  id: string;
  /** Sound reduction index Rw (dB) */
  soundReductionIndexRw?: number;
}

export interface Floor {
  id: string;
  /** Impact sound level L'n,w (dB) */
  impactSoundLevelLnw?: number;
}

export interface LivingUnit {
  id: string;
  /** True if smoke detectors in bedrooms and corridors */
  hasSmokeDetectorsInBedrooms?: boolean;
}

export interface BasementRoom {
  id: string;
  /** Clear height (m) */
  heightM?: number;
}

export interface Roof {
  id: string;
  /** True if PV installation planned */
  hasPVInstallation?: boolean;
}

export interface PlanElements {
  rooms: Room[];
  corridors: Corridor[];
  doors: Door[];
  windows: Window[];
  stairs: Stair[];
  escapeRoutes: EscapeRoute[];
  railings?: Railing[];
  walls?: Wall[];
  stairwells?: Stairwell[];
  handrails?: Handrail[];
  stair_landings?: StairLanding[];
  building?: Building;
  buildings?: Building[];
  access_roads?: AccessRoad[];
  apartments?: Apartment[];
  kitchens?: Kitchen[];
  showers?: Shower[];
  entrances?: Entrance[];
  balcony_doors?: BalconyDoor[];
  trash_rooms?: TrashRoom[];
  lifts?: Lift[];
  lift_foyers?: LiftFoyer[];
  thresholds?: Threshold[];
  toilets?: Toilet[];
  washbasins?: Washbasin[];
  ramps?: Ramp[];
  balconies?: Balcony[];
  site?: Site[];
  partition_walls?: PartitionWall[];
  floors?: Floor[];
  living_units?: LivingUnit[];
  basement_rooms?: BasementRoom[];
  roof?: Roof[];
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
