/**
 * Review workflow constants for violation decisions.
 * Professional wording suitable for architecture/compliance workflows.
 */

export const VIOLATION_STATUSES = ["open", "confirmed", "dismissed", "deferred", "resolved"] as const;
export type ViolationStatus = (typeof VIOLATION_STATUSES)[number];

export const DISMISS_REASONS = [
  { value: "false_positive", label: "Falscher Treffer (False Positive)" },
  { value: "not_applicable", label: "Nicht anwendbar" },
  { value: "extraction_error", label: "Extraktionsfehler" },
  { value: "exception_case", label: "Ausnahmefall" },
] as const;

export const DEFER_REASONS = [
  { value: "will_fix_later", label: "Wird später behoben" },
  { value: "waiting_client_input", label: "Warte auf Angaben des Auftraggebers" },
  { value: "waiting_consultant_input", label: "Warte auf Stellungnahme des Fachplaners" },
  { value: "non_blocking_stage", label: "Für aktuelle Phase nicht relevant" },
] as const;

export const DISMISS_REASON_VALUES = DISMISS_REASONS.map((r) => r.value);
export const DEFER_REASON_VALUES = DEFER_REASONS.map((r) => r.value);
