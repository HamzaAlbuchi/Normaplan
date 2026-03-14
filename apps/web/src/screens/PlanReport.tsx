import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plansApi, runsApi, type Violation, type RunDetail } from "../api/client";

const SEVERITY_LABELS: Record<string, string> = {
  error: "Kritisch",
  warning: "Warnungen",
  info: "Hinweise / Empfehlungen",
};

function groupViolations(violations: Violation[]): { error: Violation[]; warning: Violation[]; info: Violation[] } {
  const error: Violation[] = [];
  const warning: Violation[] = [];
  const info: Violation[] = [];
  for (const v of violations) {
    if (v.severity === "error") error.push(v);
    else if (v.severity === "warning") warning.push(v);
    else info.push(v);
  }
  return { error, warning, info };
}

function ViolationCard({ v }: { v: Violation }) {
  const severityClass =
    v.severity === "error"
      ? "border-l-4 border-red-500 bg-red-50/50"
      : v.severity === "warning"
        ? "border-l-4 border-amber-500 bg-amber-50/50"
        : "border-l-4 border-slate-300 bg-slate-50";
  return (
    <div className={`rounded-r-lg p-4 ${severityClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-medium uppercase text-slate-500">{v.ruleName}</span>
          <p className="mt-1 text-slate-800">{v.message}</p>
          {v.suggestion && (
            <p className="mt-2 text-sm text-slate-600">
              <strong>Vorschlag:</strong> {v.suggestion}
            </p>
          )}
          {v.regulationRef && (
            <p className="mt-1 text-xs text-slate-400">Referenz: {v.regulationRef}</p>
          )}
        </div>
        {v.actualValue != null && v.requiredValue != null && (
          <div className="text-right text-sm whitespace-nowrap">
            <span className="text-slate-500">{v.actualValue} m</span>
            <span className="mx-1">→</span>
            <span className="text-slate-700">min. {v.requiredValue} m</span>
          </div>
        )}
      </div>
      {Array.isArray(v.elementIds) && v.elementIds.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">Betroffene Elemente: {v.elementIds.join(", ")}</p>
      )}
    </div>
  );
}

function ViolationSection({
  title,
  count,
  violations,
  severity,
}: {
  title: string;
  count: number;
  violations: Violation[];
  severity: "error" | "warning" | "info";
}) {
  if (violations.length === 0) return null;
  const bg =
    severity === "error"
      ? "bg-red-50 border-red-200"
      : severity === "warning"
        ? "bg-amber-50 border-amber-200"
        : "bg-slate-50 border-slate-200";
  return (
    <section className={`rounded-xl border p-5 ${bg} print:break-inside-avoid`}>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 mb-4">{count} {count === 1 ? "Eintrag" : "Einträge"}</p>
      <ul className="space-y-4">
        {violations.map((v, i) => (
          <li key={i}>
            <ViolationCard v={v} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReportWithExport({
  plan,
  run,
}: {
  plan: { name: string; fileName: string };
  run: RunDetail;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const grouped = Array.isArray(run.violations)
    ? groupViolations(run.violations)
    : { error: [], warning: [], info: [] };

  const handleExportPdf = () => {
    const el = printRef.current;
    if (!el) return;
    const prevTitle = document.title;
    document.title = `BauPilot Prüfbericht – ${plan.name}`;
    const printStyles = document.createElement("style");
    printStyles.textContent = `
      @media print { body * { visibility: hidden; } .print-only, .print-only * { visibility: visible; } .print-only { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }
    `;
    document.head.appendChild(printStyles);
    el.classList.add("print-only");
    window.print();
    el.classList.remove("print-only");
    document.head.removeChild(printStyles);
    document.title = prevTitle;
  };

  return (
    <div ref={printRef} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="BauPilot" className="h-16 object-contain flex-shrink-0" />
          <div>
            <h2 className="font-semibold text-slate-800">Prüfbericht – {plan.name}</h2>
            <p className="text-sm text-slate-500 mt-1">
            Geprüft am {run.checkedAt ? new Date(run.checkedAt).toLocaleString("de-DE") : "—"} ·{" "}
            {run.violationCount ?? 0} mögliche Verstöße ({run.errorCount ?? 0} Kritisch, {run.warningCount ?? 0} Warnungen, {grouped.info.length} Hinweise)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          className="no-print rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Als PDF exportieren
        </button>
      </div>
      <div className="p-6">
        <p className="text-xs text-slate-500 mb-6">
          Dies ist keine rechtliche Bewertung. Bitte prüfen Sie die Hinweise und beziehen Sie die zuständigen Vorschriften ein.
        </p>
        {!Array.isArray(run.violations) || run.violations.length === 0 ? (
          <p className="text-slate-600">Keine Verstöße gefunden.</p>
        ) : (
          <div className="space-y-6">
            <ViolationSection
              title={SEVERITY_LABELS.error}
              count={grouped.error.length}
              violations={grouped.error}
              severity="error"
            />
            <ViolationSection
              title={SEVERITY_LABELS.warning}
              count={grouped.warning.length}
              violations={grouped.warning}
              severity="warning"
            />
            <ViolationSection
              title={SEVERITY_LABELS.info}
              count={grouped.info.length}
              violations={grouped.info}
              severity="info"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlanReport() {
  const { planId } = useParams<{ planId: string }>();
  const queryClient = useQueryClient();

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => plansApi.get(planId!),
    enabled: !!planId,
  });

  const runMutation = useMutation({
    mutationFn: () => runsApi.create(planId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      queryClient.setQueryData(["run", data.id], data);
    },
  });

  const runId = plan?.lastRunId;
  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => runsApi.get(runId!),
    enabled: !!runId,
  });

  const hasRun = !!run;
  const canRun = Boolean(plan?.status === "ready" && plan?.elements);

  return (
    <div className="max-w-4xl">
      <Link
        to={plan ? `/project/${plan.projectId}` : "/"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Zurück zum Projekt
      </Link>

      {planLoading || !plan ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">Plan wird geladen…</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{plan.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {plan.fileName} · Status: {plan.status}
              </p>
              {plan.extractionError && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {plan.extractionError}
                </p>
              )}
            </div>
            {canRun && (
              <button
                type="button"
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending}
                className="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {runMutation.isPending ? "Prüfe…" : "Prüflauf starten"}
              </button>
            )}
          </div>

          {!canRun && plan.status !== "ready" && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Laden Sie eine gültige JSON- oder PDF-Plan-Datei hoch, um die Regelprüfung zu starten.
            </div>
          )}

          {runMutation.isError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {runMutation.error instanceof Error ? runMutation.error.message : String(runMutation.error)}
            </div>
          )}

          {hasRun && run && (
            <ReportWithExport plan={plan} run={run} />
          )}

          {!hasRun && canRun && !runMutation.isPending && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <p className="text-sm text-slate-500">Klicken Sie auf „Prüflauf starten“, um die Bauvorschriften-Checks auszuführen.</p>
            </div>
          )}

          {runLoading && runId && !run && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-sm text-slate-500">Bericht wird geladen…</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
