/**
 * PDF export: renders the report in a hidden iframe and triggers print.
 * No new tab opens. Uses a dedicated report template, not the dashboard UI.
 */

import type { RunDetail } from "../api/client";
import { groupSimilarFindings, getTopPriorityFindings } from "./reportHelpers";
import { buildReportHtml } from "./reportTemplate";

export interface ExportPdfParams {
  plan: { name: string; fileName: string };
  run: RunDetail;
  planId: string;
}

/**
 * Render the report in a hidden iframe and trigger print dialog.
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

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.left = "-9999px";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      document.body.removeChild(iframe);
    } catch {
      /* already removed */
    }
  };
  iframe.contentWindow?.addEventListener("afterprint", cleanup);
  setTimeout(cleanup, 30000);
}
