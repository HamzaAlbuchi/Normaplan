/**
 * BauPilot PDF Report — server-rendered (ReportLab) download.
 */

export { exportReportAsPdf } from "./exportPdf";
export type { ExportPdfParams } from "./exportPdfTypes";
export {
  groupSimilarFindings,
  getTopPriorityFindings,
  isAiViolation,
  getSourceType,
  sortBySeverity,
  SEVERITY_LABELS,
} from "./reportHelpers";
export type { GroupedFinding } from "./reportHelpers";
