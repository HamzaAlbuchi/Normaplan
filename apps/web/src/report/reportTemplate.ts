/**
 * BauPilot PDF Report Template
 * Generates a standalone HTML document for print/PDF export.
 * Optimized for A4 portrait. Do not reuse dashboard UI.
 */

import type { RunDetail } from "../api/client";
import type { GroupedFinding } from "./reportHelpers";
import {
  SEVERITY_LABELS,
  getSummaryByCategoryAndSeverity,
  getRecommendedNextSteps,
} from "./reportHelpers";

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

function formatValue(val: number, required?: number): string {
  if (required != null && required > 0 && required <= 1 && val <= 1)
    return `${(val * 100).toFixed(1)}% → min. ${(required * 100).toFixed(1)}%`;
  if (required != null) return `${val} → min. ${required}`;
  return String(val);
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

function buildTop3Handlungsfelder(findings: GroupedFinding[]): string {
  if (findings.length === 0) return "";
  const top3 = findings.slice(0, 3);
  const hasSourceBadge = findings.some((f) => f.sourceBadge);
  return `
    <div class="report-top3">
      <h2 class="report-h2">Top 3 Handlungsfelder</h2>
      <table class="report-top3-table">
        <thead>
          <tr>
            <th>Nr.</th>
            <th>Kategorie</th>
            <th>Regel</th>
            ${hasSourceBadge ? "<th>Quelle</th>" : ""}
            <th>Schwere</th>
            <th>Anzahl</th>
          </tr>
        </thead>
        <tbody>
          ${top3
            .map(
              (f, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(f.category)}</td>
              <td>${escapeHtml(f.ruleName)}</td>
              ${hasSourceBadge ? `<td>${escapeHtml(f.sourceBadge ?? f.sourceType)}</td>` : ""}
              <td><span class="report-sev-badge ${severityClass(f.severity)}">${escapeHtml(SEVERITY_LABELS[f.severity] ?? f.severity)}</span></td>
              <td>${f.count}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function buildEmpfohleneSchritte(steps: string[]): string {
  if (steps.length === 0) return "";
  return `
    <div class="report-next-steps">
      <h2 class="report-h2">Empfohlene nächste Schritte</h2>
      <ol class="report-steps-list">
        ${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
      </ol>
    </div>
  `;
}

function buildSummaryTable(rows: { category: string; error: number; warning: number; info: number }[]): string {
  if (rows.length === 0) return "";
  return `
    <div class="report-summary-table-wrap">
      <h2 class="report-h2">Übersicht nach Kategorie</h2>
      <table class="report-summary-table">
        <thead>
          <tr>
            <th>Kategorie</th>
            <th>Kritisch</th>
            <th>Warnung</th>
            <th>Hinweis</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${escapeHtml(r.category)}</td>
              <td>${r.error}</td>
              <td>${r.warning}</td>
              <td>${r.info}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function buildFindingsSection(findings: GroupedFinding[], severity: string): string {
  if (findings.length === 0) return "";
  const filtered = findings.filter((f) => f.severity === severity);
  if (filtered.length === 0) return "";
  const sevLabel = SEVERITY_LABELS[severity] ?? severity;
  const hasSourceBadge = filtered.some((f) => f.sourceBadge);
  return `
    <div class="report-finding-group">
      <h3 class="report-h3">${escapeHtml(sevLabel)}</h3>
      <table class="report-findings-table">
        <thead>
          <tr>
            <th>Regel</th>
            <th>Kategorie</th>
            ${hasSourceBadge ? "<th>Quelle</th>" : ""}
            <th>Anz.</th>
            <th>Wert / Soll</th>
            <th>Erklärung</th>
            <th>Vorschlag</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map(
              (f) => `
            <tr class="${severityClass(f.severity)}">
              <td>${escapeHtml(f.ruleName)}</td>
              <td>${escapeHtml(f.category)}</td>
              ${hasSourceBadge ? `<td><span class="report-source-badge">${escapeHtml(f.sourceBadge ?? f.sourceType)}</span></td>` : ""}
              <td>${f.count}</td>
              <td>${f.worstActualValue != null && f.requiredValue != null ? formatValue(f.worstActualValue, f.requiredValue) : f.worstActualValue != null ? String(f.worstActualValue) : "—"}</td>
              <td>${escapeHtml(f.message)}</td>
              <td>${escapeHtml(f.suggestion ?? "—")}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function buildFindingsUnified(findings: GroupedFinding[]): string {
  const errors = buildFindingsSection(findings, "error");
  const warnings = buildFindingsSection(findings, "warning");
  const info = buildFindingsSection(findings, "info");
  if (!errors && !warnings && !info) return "";

  return `
    <section class="report-section report-page-break-before">
      <h2 class="report-h2">Detaillierte Befunde</h2>
      <p class="report-desc">Kanonisch zusammengeführte Befunde aus regelbasierter Prüfung und KI-Analyse. Quelle: Regelbasiert, AI-gestützt (Regel + KI), AI-only.</p>
      <div class="report-source-block">
        ${errors}${warnings}${info}
      </div>
    </section>
  `;
}

function buildAppendix(findings: GroupedFinding[]): string {
  const rows: { elementId: string; findingGroups: string[] }[] = [];
  const elementToFindings = new Map<string, string[]>();
  for (const f of findings) {
    const label = `${f.ruleName} (${f.category})`;
    for (const id of f.elementIds) {
      const list = elementToFindings.get(id) ?? [];
      if (!list.includes(label)) list.push(label);
      elementToFindings.set(id, list);
    }
  }
  for (const [id, groups] of elementToFindings) {
    rows.push({ elementId: id, findingGroups: groups });
  }
  rows.sort((a, b) => a.elementId.localeCompare(b.elementId));
  if (rows.length === 0) return "";
  return `
    <section class="report-section report-page-break-before">
      <h2 class="report-h2">Anhang: Betroffene Elemente</h2>
      <p class="report-desc">Zuordnung der Element-IDs zu den gruppierten Befunden.</p>
      <table class="report-appendix-table">
        <thead>
          <tr>
            <th>Element-ID</th>
            <th>Zugehörige Befunde</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td class="report-appendix-id">${escapeHtml(r.elementId)}</td>
              <td>${r.findingGroups.map((g) => escapeHtml(g)).join("; ")}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
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
    .report-finding-rule { font-size: 9pt; color: #334155; margin-left: 4px; }
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
    .report-executive { margin-bottom: 24px; }
    .report-top3 { margin-bottom: 20px; }
    .report-top3-table, .report-summary-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .report-top3-table th, .report-top3-table td, .report-summary-table th, .report-summary-table td { padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; }
    .report-top3-table th, .report-summary-table th { background: #f8fafc; font-weight: 600; color: #475569; }
    .report-summary-table-wrap { margin-bottom: 20px; }
    .report-next-steps { margin-bottom: 20px; }
    .report-steps-list { margin: 0; padding-left: 20px; font-size: 10pt; color: #334155; }
    .report-steps-list li { margin-bottom: 4px; }
    .report-sev-badge { font-size: 8pt; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
    .report-sev-badge.report-sev-error { background: #dc2626; color: white; }
    .report-source-badge { font-size: 8pt; padding: 2px 6px; border-radius: 4px; background: #e2e8f0; color: #475569; }
    .report-sev-badge.report-sev-warning { background: #d97706; color: white; }
    .report-sev-badge.report-sev-info { background: #64748b; color: white; }
    .report-findings-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .report-findings-table th, .report-findings-table td { padding: 8px 10px; text-align: left; border: 1px solid #e2e8f0; vertical-align: top; }
    .report-findings-table th { background: #f8fafc; font-weight: 600; color: #475569; }
    .report-findings-table tr.report-sev-error td { background: #fef2f2; }
    .report-findings-table tr.report-sev-warning td { background: #fffbeb; }
    .report-findings-table tr.report-sev-info td { background: #f8fafc; }
    .report-appendix-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .report-appendix-table th, .report-appendix-table td { padding: 6px 8px; text-align: left; border: 1px solid #e2e8f0; }
    .report-appendix-table th { background: #f8fafc; font-weight: 600; color: #475569; }
    .report-appendix-id { font-family: ui-monospace, monospace; font-size: 8pt; }
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

  const summaryRows = getSummaryByCategoryAndSeverity(groupedFindings);
  const nextSteps = getRecommendedNextSteps(groupedFindings);

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

      <div class="report-executive report-page-break-after">
        ${buildTop3Handlungsfelder(topFindings)}
        ${buildEmpfohleneSchritte(nextSteps)}
        ${buildSummaryTable(summaryRows)}
      </div>

      ${buildFindingsUnified(groupedFindings)}

      ${buildMethodology()}

      ${buildAppendix(groupedFindings)}

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
