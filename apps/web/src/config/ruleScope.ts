/**
 * Rule scope configuration for the Prüfumfang page.
 * Maps API categories to German display names and defines display order.
 * Extensible for future metadata (status, lastReviewed, etc.).
 */

export type RuleStatus = "covered" | "in_preparation" | "limited" | "informational";

export const CATEGORY_LABELS: Record<string, string> = {
  accessibility: "Barrierefreiheit",
  escape: "Flucht- und Rettungswege",
  geometry: "Geometrie / Belichtung",
  fire: "Brandschutz",
  safety: "Sicherheit",
  planning: "Planung / Bauordnung",
};

/** Display order for categories on the Prüfumfang page */
export const CATEGORY_ORDER = [
  "accessibility",
  "escape",
  "geometry",
  "fire",
  "safety",
  "planning",
];

export const STATUS_LABELS: Record<RuleStatus, string> = {
  covered: "Abgedeckt",
  in_preparation: "In Vorbereitung",
  limited: "Eingeschränkt",
  informational: "Nur Hinweischarakter",
};

/** Optional overlay: ruleId -> status. Rules not listed default to "covered". */
export const RULE_STATUS_OVERLAY: Partial<Record<string, RuleStatus>> = {
  // Example: "some_rule_id": "limited",
};

export const SEVERITY_LABELS: Record<string, string> = {
  error: "Fehler",
  warning: "Hinweis",
  info: "Information",
};

/** State codes to full names for jurisdiction display */
export const STATE_NAMES: Record<string, string> = {
  ALL: "Alle Bundesländer",
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};
