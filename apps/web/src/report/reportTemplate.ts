/**
 * BauPilot PDF Report Template
 * Generates a standalone HTML document for print/PDF export.
 * Optimized for A4 portrait. Do not reuse dashboard UI.
 */

import type { RunDetail } from "../api/client";
import type { GroupedFinding } from "./reportHelpers";
import { SEVERITY_LABELS } from "./reportHelpers";

export interface ReportData {
  plan: { name: string; fileName: string };
  run: RunDetail;
  planId: string;
  logoUrl: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function severityClass(severity: string): string {
  if (severity === "error") return "report-sev-error";
  if (severity === "warning") return "report-sev-warning";
  return "report-sev-info";
}

function buildFindingCard(f: GroupedFinding, index: number): string {
  const sevLabel = SEVERITY_LABELS[f.severity] ?? f.severity;
  const values =
    f.actualValue != null && f.requiredValue != null
      ? `<span class="report-values">${f.actualValue} m → min. ${f.requiredValue} m</span>`
      : "";
  const elements =
    f.elementIds.length > 0
      ? `<p class="report-elements">Betroffene Elemente: ${escapeHtml(f.elementIds.join(", "))}</p>`
      : "";
  const ref = f.regulationRef
    ? `<p class="report-ref">Referenz: ${escapeHtml(f.regulationRef)}</p>`
    : "";
  const suggestion = f.suggestion
    ? `<p class="report-suggestion"><strong>Vorschlag:</strong> ${escapeHtml(f.suggestion)}</p>`
    : "";
  const countNote = f.count > 1 ? ` <span class="report-count">(${f.count}×)</span>` : "";

  return `
    <div class="report-finding ${severityClass(f.severity)}">
      <div class="report-finding-header">
        <span class="report-finding-num">${index}</span>
        <span class="report-finding-sev">${escapeHtml(sevLabel)}</span>
        <span class="report-finding-source">${escapeHtml(f.sourceType)}</span>
        <span class="report-finding-cat">${escapeHtml(f.ruleName)}${countNote}</span>
      </div>
      <p class="report-finding-msg">${escapeHtml(f.message)}</p>
      ${values}${elements}${ref}${suggestion}
    </div>
  `;
}

function buildSummaryCards(
  total: number,
  critical: number,
  warnings: number,
  notes: number
): string {
  return `
    <div class="report-summary">
      <div class="report-summary-card">
        <span class="report-summary-val">${total}</span>
        <span class="report-summary-label">Befunde gesamt</span>
      </div>
      <div class="report-summary-card report-summary-critical">
        <span class="report-summary-val">${critical}</span>
        <span class="report-summary-label">Kritisch</span>
      </div>
      <div class="report-summary-card report-summary-warning">
        <span class="report-summary-val">${warnings}</span>
        <span class="report-summary-label">Warnungen</span>
      </div>
      <div class="report-summary-card report-summary-info">
        <span class="report-summary-val">${notes}</span>
        <span class="report-summary-label">Hinweise</span>
      </div>
    </div>
  `;
}

function buildTopFindings(findings: GroupedFinding[]): string {
  if (findings.length === 0) return "";
  return `
    <section class="report-section report-page-break-after">
      <h2 class="report-h2">Prioritäre Befunde</h2>
      <p class="report-desc">Die wichtigsten zu prüfenden Punkte:</p>
      ${findings.map((f, i) => buildFindingCard(f, i + 1)).join("")}
    </section>
  `;
}

function buildFindingsSection(
  title: string,
  findings: GroupedFinding[],
  severity: string
): string {
  if (findings.length === 0) return "";
  const filtered = findings.filter((f) => f.severity === severity);
  if (filtered.length === 0) return "";
  const sevLabel = SEVERITY_LABELS[severity] ?? severity;
  return `
    <section class="report-section report-finding-group">
      <h3 class="report-h3">${escapeHtml(sevLabel)}</h3>
      <p class="report-finding-count">${filtered.length} ${filtered.length === 1 ? "Eintrag" : "Einträge"}</p>
      ${filtered.map((f, i) => buildFindingCard(f, i + 1)).join("")}
    </section>
  `;
}

function buildFindingsBySource(
  ruleFindings: GroupedFinding[],
  aiFindings: GroupedFinding[]
): string {
  const ruleErrors = buildFindingsSection(
    "Regelbasierte Prüfung",
    ruleFindings,
    "error"
  );
  const ruleWarnings = buildFindingsSection(
    "Regelbasierte Prüfung",
    ruleFindings,
    "warning"
  );
  const ruleInfo = buildFindingsSection(
    "Regelbasierte Prüfung",
    ruleFindings,
    "info"
  );
  const aiErrors = buildFindingsSection("KI-Analyse", aiFindings, "error");
  const aiWarnings = buildFindingsSection("KI-Analyse", aiFindings, "warning");
  const aiInfo = buildFindingsSection("KI-Analyse", aiFindings, "info");

  const ruleSection =
    ruleErrors || ruleWarnings || ruleInfo
      ? `
    <div class="report-source-block">
      <h2 class="report-h2">Regelbasierte Prüfung</h2>
      <p class="report-desc">Automatisierte Prüfung gegen definierte Bauvorschriften (MBO, DIN, LBO).</p>
      ${ruleErrors}${ruleWarnings}${ruleInfo}
    </div>
  `
      : "";

  const aiSection =
    aiErrors || aiWarnings || aiInfo
      ? `
    <div class="report-source-block report-source-ai">
      <h2 class="report-h2">KI-Analyse</h2>
      <p class="report-desc">Zusätzliche Hinweise durch KI (keine rechtliche Bewertung. Bitte manuell prüfen.)</p>
      ${aiErrors}${aiWarnings}${aiInfo}
    </div>
  `
      : "";

  return `
    <section class="report-section report-page-break-before">
      <h2 class="report-h2">Detaillierte Befunde</h2>
      ${ruleSection}${aiSection}
    </section>
  `;
}

function buildAppendix(elementIds: string[]): string {
  const unique = [...new Set(elementIds)].sort();
  if (unique.length === 0) return "";
  return `
    <section class="report-section report-page-break-before">
      <h2 class="report-h2">Anhang: Betroffene Element-IDs</h2>
      <p class="report-appendix-list">${escapeHtml(unique.join(", "))}</p>
    </section>
  `;
}

function buildMethodology(): string {
  return `
    <section class="report-section report-methodology">
      <h2 class="report-h2">Methodik & Hinweis</h2>
      <p class="report-methodology-text">
        Dieser Bericht wurde automatisch erstellt. Er stellt keine rechtliche Bewertung dar,
        ersetzt keine behördliche Prüfung und kein Fachgutachten. Die Befunde sind als
        Hinweise und mögliche Abweichungen zu verstehen. Bitte beziehen Sie die zuständigen
        Vorschriften und Fachplaner ein.
      </p>
    </section>
  `;
}

function getReportStyles(): string {
  return `
    @page {
      size: A4 portrait;
      margin: 18mm 18mm 24mm 18mm;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font: 11pt/1.5 "Inter", system-ui, sans-serif; color: #1e293b; }
    .report-page { margin: 0; padding: 0; }
    .report-page-break-before { page-break-before: always; }
    .report-page-break-after { page-break-after: always; }
    .report-break-inside-avoid { page-break-inside: avoid; }
    .report-header { display: flex; align-items: flex-start; gap: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .report-logo { height: 48px; width: auto; }
    .report-title-block { flex: 1; }
    .report-title { font-size: 22pt; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
    .report-subtitle { font-size: 12pt; color: #64748b; margin: 0; }
    .report-meta { font-size: 10pt; color: #64748b; margin-top: 12px; }
    .report-disclaimer { font-size: 9pt; color: #64748b; margin: 0 0 24px 0; padding: 12px; background: #f8fafc; border-radius: 4px; }
    .report-summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
    .report-summary-card { flex: 1; min-width: 100px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; }
    .report-summary-val { display: block; font-size: 20pt; font-weight: 700; color: #0f172a; }
    .report-summary-label { font-size: 9pt; color: #64748b; }
    .report-summary-critical .report-summary-val { color: #dc2626; }
    .report-summary-warning .report-summary-val { color: #d97706; }
    .report-summary-info .report-summary-val { color: #64748b; }
    .report-section { margin-bottom: 28px; }
    .report-h2 { font-size: 14pt; font-weight: 600; color: #0f172a; margin: 0 0 8px 0; }
    .report-h3 { font-size: 11pt; font-weight: 600; color: #334155; margin: 16px 0 8px 0; }
    .report-desc { font-size: 9pt; color: #64748b; margin: 0 0 12px 0; }
    .report-finding-count { font-size: 9pt; color: #64748b; margin: 0 0 12px 0; }
    .report-finding { margin-bottom: 16px; padding: 12px; border-radius: 6px; border-left: 4px solid #94a3b8; page-break-inside: avoid; }
    .report-sev-error { border-left-color: #dc2626; background: #fef2f2; }
    .report-sev-warning { border-left-color: #d97706; background: #fffbeb; }
    .report-sev-info { border-left-color: #94a3b8; background: #f8fafc; }
    .report-finding-header { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
    .report-finding-num { font-weight: 600; color: #64748b; margin-right: 4px; }
    .report-finding-sev { font-size: 9pt; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
    .report-sev-error .report-finding-sev { background: #dc2626; color: white; }
    .report-sev-warning .report-finding-sev { background: #d97706; color: white; }
    .report-sev-info .report-finding-sev { background: #64748b; color: white; }
    .report-finding-source { font-size: 8pt; color: #64748b; margin-left: 4px; }
    .report-finding-cat { font-size: 9pt; color: #475569; }
    .report-finding-msg { margin: 0 0 8px 0; font-size: 10pt; }
    .report-values { font-size: 9pt; color: #64748b; display: block; margin-bottom: 4px; }
    .report-elements { font-size: 9pt; color: #64748b; margin: 4px 0 0 0; }
    .report-ref { font-size: 8pt; color: #94a3b8; margin: 4px 0 0 0; }
    .report-suggestion { font-size: 9pt; color: #475569; margin: 8px 0 0 0; }
    .report-count { font-size: 8pt; color: #94a3b8; }
    .report-source-block { margin-bottom: 24px; }
    .report-source-ai { padding: 16px; border: 1px solid #c7d2fe; background: #eef2ff; border-radius: 8px; }
    .report-methodology { background: #f8fafc; padding: 16px; border-radius: 6px; }
    .report-methodology-text { font-size: 9pt; color: #64748b; margin: 0; }
    .report-appendix-list { font-size: 9pt; color: #64748b; word-break: break-all; }
    .report-footer {
      margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0;
      font-size: 8pt; color: #94a3b8; text-align: center;
    }
    @media print {
      .report-footer {
        position: fixed; bottom: 0; left: 0; right: 0;
        margin: 0; padding: 8px 18mm;
        background: white; border-top: 1px solid #e2e8f0;
      }
    }
  `;
}

function buildFooter(): string {
  const now = new Date().toLocaleString("de-DE");
  return `
    <div class="report-footer">
      Erstellt am ${escapeHtml(now)} · BauPilot Prüfbericht
    </div>
  `;
}

/**
 * Build the complete HTML document for the report.
 * Caller opens this in a new window and triggers print.
 */
export function buildReportHtml(
  data: ReportData,
  groupedFindings: GroupedFinding[],
  topFindings: GroupedFinding[]
): string {
  const { plan, run, logoUrl } = data;
  const violations = Array.isArray(run.violations) ? run.violations : [];
  const ruleFindings = groupedFindings.filter((f) => f.sourceType === "Regelbasiert");
  const aiFindings = groupedFindings.filter((f) => f.sourceType === "KI-gestützt");

  const total = run.violationCount ?? 0;
  const critical = run.errorCount ?? 0;
  const warnings = run.warningCount ?? 0;
  const notes = total - critical - warnings;

  const reportDate = run.checkedAt
    ? new Date(run.checkedAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  const allElementIds = groupedFindings.flatMap((f) => f.elementIds);

  const body = `
    <div class="report-page">
      <header class="report-header report-break-inside-avoid">
        <img src="${escapeHtml(logoUrl)}" alt="BauPilot" class="report-logo" />
        <div class="report-title-block">
          <h1 class="report-title">Prüfbericht</h1>
          <p class="report-subtitle">${escapeHtml(plan.name)}</p>
          <p class="report-meta">
            ${escapeHtml(plan.fileName)} · Bericht vom ${escapeHtml(reportDate)} · ID: ${escapeHtml(run.id)}
          </p>
        </div>
      </header>

      <p class="report-disclaimer">
        Dies ist keine rechtliche Bewertung. Bitte prüfen Sie die Hinweise und beziehen Sie die zuständigen Vorschriften ein.
      </p>

      ${buildSummaryCards(total, critical, warnings, notes)}

      ${buildTopFindings(topFindings)}

      ${buildFindingsBySource(ruleFindings, aiFindings)}

      ${buildMethodology()}

      ${buildAppendix(allElementIds)}

      ${buildFooter()}
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BauPilot Prüfbericht – ${escapeHtml(plan.name)}</title>
  <style>${getReportStyles()}</style>
</head>
<body>
${body}
</body>
</html>`;
}
