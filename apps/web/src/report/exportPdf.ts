/**
 * PDF export: opens the report in a new window and triggers print.
 * The report is a standalone HTML document, not the dashboard UI.
 */

import type { PlanDetail, RunDetail } from "../api/client";
import { groupSimilarFindings, getTopPriorityFindings } from "./reportHelpers";
import { buildReportHtml } from "./reportTemplate";

export interface ExportPdfParams {
  plan: { name: string; fileName: string };
  run: RunDetail;
  planId: string;
}

/**
 * Open the report in a new window and trigger print dialog.
 * Uses a dedicated report template - does not print the main app.
 */
export function exportReportAsPdf(params: ExportPdfParams): void {
  const { plan, run } = params;
  const violations = Array.isArray(run.violations) ? run.violations : [];

  const groupedFindings = groupSimilarFindings(violations);
  const topFindings = getTopPriorityFindings(violations, 3);

  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/logo.png`
      : "/logo.png";

  const html = buildReportHtml(
    { plan, run, planId: params.planId, logoUrl },
    groupedFindings,
    topFindings
  );

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Pop-up blockiert. Bitte erlauben Sie Pop-ups für den PDF-Export.");
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };
}
