import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plansApi, runsApi, type RunDetail, type Violation } from "../api/client";

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
      {v.elementIds.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">Betroffene Elemente: {v.elementIds.join(", ")}</p>
      )}
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
  const canRun = plan?.status === "ready" && plan?.elements;

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to={plan ? `/project/${plan.projectId}` : "/"}
        className="text-sm text-primary-600 hover:underline mb-4 inline-block"
      >
        ← Zurück zum Projekt
      </Link>

      {planLoading || !plan ? (
        <p className="text-slate-500">Lade Plan…</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">{plan.name}</h1>
              <p className="text-slate-500 text-sm">
                {plan.fileName} · Status: {plan.status}
              </p>
              {plan.extractionError && (
                <p className="mt-2 text-amber-700 text-sm bg-amber-50 p-2 rounded">
                  {plan.extractionError}
                </p>
              )}
            </div>
            {canRun && (
              <button
                type="button"
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {runMutation.isPending ? "Prüfe…" : "Prüflauf starten"}
              </button>
            )}
          </div>

          {!canRun && plan.status !== "ready" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm mb-6">
              Laden Sie eine gültige JSON-Plan-Datei hoch, um die Regelprüfung zu starten.
            </div>
          )}

          {runMutation.isError && (
            <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm p-3">
              {runMutation.error instanceof Error ? runMutation.error.message : "Fehler"}
            </div>
          )}

          {hasRun && run && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-800">Prüfbericht</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Geprüft am {new Date(run.checkedAt).toLocaleString("de-DE")} ·{" "}
                  {run.violationCount} mögliche Verstöße ({run.errorCount} Fehler, {run.warningCount} Warnungen)
                </p>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-500 mb-4">
                  Dies ist keine rechtliche Bewertung. Bitte prüfen Sie die Hinweise und beziehen Sie die zuständigen Vorschriften ein.
                </p>
                {run.violations.length === 0 ? (
                  <p className="text-slate-600">Keine Verstöße gefunden.</p>
                ) : (
                  <ul className="space-y-4">
                    {run.violations.map((v, i) => (
                      <li key={i}>
                        <ViolationCard v={v} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
                Export (PDF/HTML) — in einer späteren Version verfügbar.
              </div>
            </div>
          )}

          {!hasRun && canRun && !runMutation.isPending && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Klicken Sie auf „Prüflauf starten“, um die Bauvorschriften-Checks auszuführen.
            </div>
          )}

          {runLoading && runId && !run && <p className="text-slate-500">Lade Bericht…</p>}
        </>
      )}
    </div>
  );
}
