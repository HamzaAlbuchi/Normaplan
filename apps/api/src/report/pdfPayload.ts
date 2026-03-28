import type { CanonicalFinding, FindingSource } from "../canonical/canonicalTypes.js";
import type { ViolationLike } from "../canonical/violationLike.js";
import { toCanonicalFindings } from "../canonical/CanonicalFindingMapper.js";

const SEVERITY_ORDER = ["error", "warning", "info"] as const;
const SEVERITY_LABELS: Record<string, string> = {
  error: "Kritisch",
  warning: "Warnung",
  info: "Hinweis",
};

function sourceBadgeLabel(source: FindingSource, supporting: FindingSource[]): string {
  if (source === "RULE_BASED" && supporting.includes("AI_ASSISTED")) return "AI-gestützt";
  if (source === "AI_ONLY") return "AI-only";
  return "Regelbasiert";
}

export interface GroupedFindingPdf {
  ruleName: string;
  severity: string;
  message: string;
  suggestion?: string;
  regulationRef?: string;
  sourceBadge: string;
  category: string;
  elementIds: string[];
  worstActualValue?: number;
  requiredValue?: number;
  count: number;
}

function canonicalToGroupedFindings(canonical: CanonicalFinding[]): GroupedFindingPdf[] {
  return canonical.map((c) => ({
    ruleName: c.title,
    severity: c.severity,
    message: c.description,
    suggestion: c.suggestion,
    regulationRef: c.reference,
    sourceBadge: sourceBadgeLabel(c.primarySource, c.supportingSources),
    category: c.category,
    elementIds: c.affectedElementIds,
    worstActualValue: c.measuredValue,
    requiredValue: c.requiredValue,
    count: c.sourceCount,
  }));
}

function getSummaryByCategoryAndSeverity(findings: GroupedFindingPdf[]): {
  category: string;
  error: number;
  warning: number;
  info: number;
}[] {
  const byCat = new Map<string, { error: number; warning: number; info: number }>();
  for (const f of findings) {
    const cat = f.category || "Sonstige";
    const row = byCat.get(cat) ?? { error: 0, warning: 0, info: 0 };
    if (f.severity === "error") row.error += f.count;
    else if (f.severity === "warning") row.warning += f.count;
    else row.info += f.count;
    byCat.set(cat, row);
  }
  const order = [
    "Rettungsweg",
    "Brandschutz",
    "Barrierefreiheit",
    "Belichtung",
    "Lüftung",
    "Türen / Erschließung",
    "Sicherheit",
    "Planung",
    "Sonstige",
  ];
  return order
    .filter((c) => byCat.has(c))
    .map((category) => ({
      category,
      ...byCat.get(category)!,
    }));
}

function getTopPriorityFindingsFromGrouped(findings: GroupedFindingPdf[], limit = 3): GroupedFindingPdf[] {
  return [...findings]
    .sort((a, b) => {
      const ai = SEVERITY_ORDER.indexOf(a.severity as (typeof SEVERITY_ORDER)[number]);
      const bi = SEVERITY_ORDER.indexOf(b.severity as (typeof SEVERITY_ORDER)[number]);
      if (ai !== bi) return ai - bi;
      return (b.count ?? 1) - (a.count ?? 1);
    })
    .slice(0, limit);
}

function getRecommendedNextSteps(findings: GroupedFindingPdf[]): string[] {
  const steps: string[] = [];
  const seen = new Set<string>();
  for (const f of findings.slice(0, 5)) {
    const key = `${f.category}|${f.ruleName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const sev = f.severity === "error" ? "kritische" : f.severity === "warning" ? "wichtige" : "weitere";
    const cat = f.category === "Sonstige" ? "" : ` (${f.category})`;
    steps.push(`${sev.charAt(0).toUpperCase() + sev.slice(1)} Befunde prüfen${cat}: ${f.ruleName}`);
    if (steps.length >= 3) break;
  }
  while (steps.length < 3) {
    steps.push("Weitere Befunde im Detailteil prüfen.");
    if (steps.length >= 3) break;
  }
  return steps.slice(0, 3);
}

function formatValue(val: number, required?: number): string {
  if (required != null && required > 0 && required <= 1 && val <= 1)
    return `${(val * 100).toFixed(1)}% → min. ${(required * 100).toFixed(1)}%`;
  if (required != null) return `${val} → min. ${required}`;
  return String(val);
}

export interface RunPdfContext {
  planName: string;
  planFileName: string;
  runId: string;
  checkedAt: string;
  violationCount: number;
  warningCount: number;
  errorCount: number;
  violations: ViolationLike[];
}

export function buildPlanReportPdfPayload(ctx: RunPdfContext): Record<string, unknown> {
  const canonical = toCanonicalFindings(ctx.violations);
  const grouped = canonicalToGroupedFindings(canonical);
  const topFindings = getTopPriorityFindingsFromGrouped(grouped, 3);
  const summaryRows = getSummaryByCategoryAndSeverity(grouped);
  const nextSteps = getRecommendedNextSteps(grouped);

  const total = ctx.violationCount ?? 0;
  const critical = ctx.errorCount ?? 0;
  const warnings = ctx.warningCount ?? 0;
  const notes = Math.max(0, total - critical - warnings);

  const checkedAtDe = ctx.checkedAt
    ? new Date(ctx.checkedAt).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const generatedAtDe = new Date().toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const detailSections = (["error", "warning", "info"] as const).map((severityKey) => {
    const rows = grouped
      .filter((f) => f.severity === severityKey)
      .map((f) => ({
        ruleName: f.ruleName,
        category: f.category,
        sourceBadge: f.sourceBadge,
        count: f.count,
        valueText:
          f.worstActualValue != null && f.requiredValue != null
            ? formatValue(f.worstActualValue, f.requiredValue)
            : f.worstActualValue != null
              ? String(f.worstActualValue)
              : "—",
        message: f.message,
        suggestion: f.suggestion ?? "—",
      }));
    return {
      severityKey,
      severityLabel: SEVERITY_LABELS[severityKey] ?? severityKey,
      rows,
    };
  });

  const elementToFindings = new Map<string, string[]>();
  for (const f of grouped) {
    const label = `${f.ruleName} (${f.category})`;
    for (const id of f.elementIds) {
      const list = elementToFindings.get(id) ?? [];
      if (!list.includes(label)) list.push(label);
      elementToFindings.set(id, list);
    }
  }
  const appendixRows = [...elementToFindings.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([elementId, groups]) => ({
      elementId,
      findingsText: groups.join("; "),
    }));

  return {
    planName: ctx.planName,
    planFileName: ctx.planFileName,
    runId: ctx.runId,
    checkedAtDe,
    generatedAtDe,
    counts: {
      total,
      error: critical,
      warning: warnings,
      info: notes,
    },
    disclaimer:
      "Dies ist keine rechtliche Bewertung. Bitte prüfen Sie die Hinweise und beziehen Sie die zuständigen Vorschriften ein.",
    topFindings: topFindings.map((f, i) => ({
      rank: i + 1,
      category: f.category,
      ruleName: f.ruleName,
      sourceBadge: f.sourceBadge,
      severityLabel: SEVERITY_LABELS[f.severity] ?? f.severity,
      count: f.count,
    })),
    nextSteps,
    summaryRows,
    detailIntro:
      "Kanonisch zusammengeführte Befunde aus regelbasierter Prüfung und KI-Analyse. Quelle: Regelbasiert, AI-gestützt (Regel + KI), AI-only.",
    detailSections,
    methodology:
      "Dieser Bericht wurde automatisch erstellt. Er stellt keine rechtliche Bewertung dar, ersetzt keine behördliche Prüfung und kein Fachgutachten. Die Befunde sind als Hinweise und mögliche Abweichungen zu verstehen. Bitte beziehen Sie die zuständigen Vorschriften und Fachplaner ein.",
    appendixRows,
  };
}
