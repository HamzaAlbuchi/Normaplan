/**
 * BauPilot PDF Report
 * Dedicated report template for compliance/plan review export.
 * Separate from the dashboard UI - generates standalone HTML for print.
 */

export { exportReportAsPdf } from "./exportPdf";
export type { ExportPdfParams } from "./exportPdf";
export {
  groupSimilarFindings,
  getTopPriorityFindings,
  isAiViolation,
  getSourceType,
  sortBySeverity,
  SEVERITY_LABELS,
} from "./reportHelpers";
export type { GroupedFinding } from "./reportHelpers";
