/**
 * CanonicalFindingMapper – entry point to convert raw violations to canonical findings.
 */

import type { Violation } from "../api/client";
import type { CanonicalFinding } from "./canonicalTypes";
import { normalizeViolations } from "./FindingNormalizationService";
import { deduplicateFindings } from "./FindingDeduplicationService";

/**
 * Convert raw violations to canonical merged findings.
 * Use this for display and export.
 */
export function toCanonicalFindings(violations: Violation[]): CanonicalFinding[] {
  const normalized = normalizeViolations(violations);
  return deduplicateFindings(normalized);
}
