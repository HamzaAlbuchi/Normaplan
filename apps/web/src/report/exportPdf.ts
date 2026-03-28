/**
 * PDF export: downloads server-rendered ReportLab PDF.
 */

import { runsApi } from "../api/client";
import type { ExportPdfParams } from "./exportPdfTypes";

function safeDownloadBasename(planName: string): string {
  const t = planName.replace(/[^\p{L}\p{N}\-_ .]+/gu, "_").trim().slice(0, 120) || "Plan";
  return `Prüfbericht-${t}.pdf`;
}

/**
 * Request PDF from API and trigger browser download.
 */
export async function exportReportAsPdf(params: ExportPdfParams): Promise<void> {
  const { plan, run } = params;
  const blob = await runsApi.downloadPdf(run.id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeDownloadBasename(plan.name);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
