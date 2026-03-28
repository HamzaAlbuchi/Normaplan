import type { ViolationLike } from "./violationLike.js";
import type { CanonicalFinding } from "./canonicalTypes.js";
import { normalizeViolations } from "./FindingNormalizationService.js";
import { deduplicateFindings } from "./FindingDeduplicationService.js";

export function toCanonicalFindings(violations: ViolationLike[]): CanonicalFinding[] {
  const normalized = normalizeViolations(violations);
  return deduplicateFindings(normalized);
}
