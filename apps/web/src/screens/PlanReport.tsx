import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plansApi, runsApi, violationsApi, REASON_LABELS, type Violation, type RunDetail } from "../api/client";
import ReviewModal, { STATUS_LABELS } from "../components/ReviewModal";
import HistoryModal from "../components/HistoryModal";
import RunAnalysisLoading from "../components/RunAnalysisLoading";
import { useAuthStore } from "../store/auth";
import { Badge, Button, Card, CardContent, PageHeader } from "../components/ui";

const SEVERITY_LABELS: Record<string, string> = {
  error: "Kritisch",
  warning: "Warnungen",
  info: "Hinweise / Empfehlungen",
};

function isAiViolation(v: Violation): boolean {
  return v.ruleId?.startsWith("ai-gemini-") ?? false;
}

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

const severityBadgeVariant = (s: string): "critical" | "warning" | "info" | "default" =>
  s === "error" ? "critical" : s === "warning" ? "warning" : s === "info" ? "info" : "default";

const statusBadgeVariant = (s: string): "default" | "warning" | "success" | "info" =>
  s === "deferred" ? "warning" : s === "resolved" ? "success" : s === "confirmed" ? "info" : "default";

function ViolationCard({
  v,
  onDismiss,
  onDefer,
  onShowHistory,
  isManager,
}: {
  v: Violation;
  onDismiss?: (id: string) => void;
  onDefer?: (id: string) => void;
  onShowHistory?: (id: string) => void;
  isManager?: boolean;
}) {
  const status = v.status ?? "open";
  const canReview = status === "open" && v.id;
  const severityClass =
    v.severity === "error"
      ? "border-l-4 border-red-500 bg-red-50/30"
      : v.severity === "warning"
        ? "border-l-4 border-amber-500 bg-amber-50/30"
        : "border-l-4 border-slate-300 bg-slate-50/50";

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${severityClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase text-slate-500">{v.ruleName}</span>
            {v.ruleId?.startsWith("ai-gemini-") && (
              <Badge variant="info" className="text-[10px]">AI</Badge>
            )}
            {status !== "open" && (
              <Badge variant={statusBadgeVariant(status)}>{STATUS_LABELS[status] ?? status}</Badge>
            )}
            <Badge variant={severityBadgeVariant(v.severity)}>
              {v.severity === "error" ? "Kritisch" : v.severity === "warning" ? "Warnung" : "Hinweis"}
            </Badge>
          </div>
          <p className="mt-2 text-slate-800">{v.message}</p>
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
      {(status === "dismissed" || status === "deferred") && (v.reason || v.comment) && (
        <p className="mt-2 text-xs text-slate-500">
          {v.reason && <span>Grund: {REASON_LABELS[v.reason] ?? v.reason}</span>}
          {v.comment && <span className="block mt-0.5">Kommentar: {v.comment}</span>}
          {v.decidedAt && (
            <span className="block mt-0.5 text-slate-400">
              Entscheidung: {new Date(v.decidedAt).toLocaleString("de-DE")}
            </span>
          )}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 no-print">
        {canReview && onDismiss && (
          <Button variant="secondary" size="sm" onClick={() => onDismiss(v.id!)}>
            Abweisen
          </Button>
        )}
        {canReview && onDefer && (
          <Button variant="secondary" size="sm" onClick={() => onDefer(v.id!)}>
            Zurückstellen
          </Button>
        )}
        {isManager && v.id && onShowHistory && (
          <Button variant="secondary" size="sm" onClick={() => onShowHistory(v.id!)}>
            Verlauf
          </Button>
        )}
      </div>
    </div>
  );
}

function ViolationSection({
  title,
  count,
  violations,
  severity,
  onDismiss,
  onDefer,
  onShowHistory,
  isManager,
}: {
  title: string;
  count: number;
  violations: Violation[];
  severity: "error" | "warning" | "info";
  onDismiss?: (id: string) => void;
  onDefer?: (id: string) => void;
  onShowHistory?: (id: string) => void;
  isManager?: boolean;
}) {
  if (violations.length === 0) return null;
  const border =
    severity === "error"
      ? "border-red-200"
      : severity === "warning"
        ? "border-amber-200"
        : "border-slate-200";
  const bg =
    severity === "error"
      ? "bg-red-50/50"
      : severity === "warning"
        ? "bg-amber-50/50"
        : "bg-slate-50/50";
  return (
    <section className={`rounded-lg border ${border} ${bg} p-5 print:break-inside-avoid`}>
      <h3 className="text-base font-semibold text-slate-800 mb-0.5">{title}</h3>
      <p className="text-sm text-slate-600 mb-4">{count} {count === 1 ? "Eintrag" : "Einträge"}</p>
      <ul className="space-y-4">
        {violations.map((v, i) => (
          <li key={v.id ?? i}>
            <ViolationCard
              v={v}
              onDismiss={onDismiss}
              onDefer={onDefer}
              onShowHistory={onShowHistory}
              isManager={isManager}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReportWithExport({
  plan,
  run,
  planId,
  onDismiss,
  onDefer,
  onShowHistory,
  isManager,
}: {
  plan: { name: string; fileName: string };
  run: RunDetail;
  planId: string;
  onDismiss?: (id: string) => void;
  onDefer?: (id: string) => void;
  onShowHistory?: (id: string) => void;
  isManager?: boolean;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const violations = Array.isArray(run.violations) ? run.violations : [];
  const ruleViolations = violations.filter((v) => !isAiViolation(v));
  const aiViolations = violations.filter((v) => isAiViolation(v));
  const groupedRule = groupViolations(ruleViolations);
  const groupedAi = groupViolations(aiViolations);

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
            {run.violationCount ?? 0} mögliche Verstöße ({run.errorCount ?? 0} Kritisch, {run.warningCount ?? 0} Warnungen, {groupedRule.info.length + groupedAi.info.length} Hinweise)
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
        <p className="text-xs text-slate-500 mb-2">
          Dies ist keine rechtliche Bewertung. Bitte prüfen Sie die Hinweise und beziehen Sie die zuständigen Vorschriften ein.
        </p>
        <p className="text-xs text-slate-500 mb-6 no-print">
          <Link to="/pruefumfang" className="text-slate-600 hover:text-slate-800 underline">
            Abgedeckte Prüfregeln anzeigen
          </Link>
        </p>
        {violations.length === 0 ? (
          <p className="text-slate-600">Keine Verstöße gefunden.</p>
        ) : (
          <div className="space-y-10">
            {ruleViolations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-300">
                  <h3 className="text-lg font-semibold text-slate-800">Regelbasierte Prüfung</h3>
                  <Badge variant="default">{ruleViolations.length} Befunde</Badge>
                </div>
                <p className="text-xs text-slate-500 -mt-2">
                  Automatisierte Prüfung gegen definierte Bauvorschriften (MBO, DIN, LBO).
                </p>
                <div className="space-y-6">
                  <ViolationSection
                    title={SEVERITY_LABELS.error}
                    count={groupedRule.error.length}
                    violations={groupedRule.error}
                    severity="error"
                    onDismiss={onDismiss}
                    onDefer={onDefer}
                    onShowHistory={onShowHistory}
                    isManager={isManager}
                  />
                  <ViolationSection
                    title={SEVERITY_LABELS.warning}
                    count={groupedRule.warning.length}
                    violations={groupedRule.warning}
                    severity="warning"
                    onDismiss={onDismiss}
                    onDefer={onDefer}
                    onShowHistory={onShowHistory}
                    isManager={isManager}
                  />
                  <ViolationSection
                    title={SEVERITY_LABELS.info}
                    count={groupedRule.info.length}
                    violations={groupedRule.info}
                    severity="info"
                    onDismiss={onDismiss}
                    onDefer={onDefer}
                    onShowHistory={onShowHistory}
                    isManager={isManager}
                  />
                </div>
              </div>
            )}

            {aiViolations.length > 0 && (
              <div className="space-y-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-6">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-indigo-300">
                  <h3 className="text-lg font-semibold text-indigo-900">KI-Analyse</h3>
                  <Badge variant="info">AI</Badge>
                  <Badge variant="default">{aiViolations.length} Befunde</Badge>
                </div>
                <p className="text-xs text-indigo-700/80 -mt-2">
                  Zusätzliche Hinweise durch KI (keine rechtliche Bewertung. Bitte manuell prüfen.)
                </p>
                <div className="space-y-6">
                  <ViolationSection
                    title={SEVERITY_LABELS.error}
                    count={groupedAi.error.length}
                    violations={groupedAi.error}
                    severity="error"
                    onDismiss={onDismiss}
                    onDefer={onDefer}
                    onShowHistory={onShowHistory}
                    isManager={isManager}
                  />
                  <ViolationSection
                    title={SEVERITY_LABELS.warning}
                    count={groupedAi.warning.length}
                    violations={groupedAi.warning}
                    severity="warning"
                    onDismiss={onDismiss}
                    onDefer={onDefer}
                    onShowHistory={onShowHistory}
                    isManager={isManager}
                  />
                  <ViolationSection
                    title={SEVERITY_LABELS.info}
                    count={groupedAi.info.length}
                    violations={groupedAi.info}
                    severity="info"
                    onDismiss={onDismiss}
                    onDefer={onDefer}
                    onShowHistory={onShowHistory}
                    isManager={isManager}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlanReport() {
  const { planId } = useParams<{ planId: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [reviewViolationId, setReviewViolationId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"dismiss" | "defer">("dismiss");
  const [historyViolationId, setHistoryViolationId] = useState<string | null>(null);

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => plansApi.get(planId!),
    enabled: !!planId,
  });

  const runMutation = useMutation({
    mutationFn: () => runsApi.create(planId!),
    onSuccess: (data) => {
      queryClient.setQueryData(["run", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
    },
  });

  const runId = plan?.lastRunId ?? (runMutation.data as RunDetail | undefined)?.id;
  const { data: runData, isLoading: runLoading } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => runsApi.get(runId!),
    enabled: !!runId,
  });
  const run = runData ?? (runMutation.data as RunDetail | undefined);

  const { data: historyData } = useQuery({
    queryKey: ["violation-history", historyViolationId],
    queryFn: () => violationsApi.getHistory(historyViolationId!),
    enabled: !!historyViolationId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, reason, comment }: { id: string; action: "dismiss" | "defer"; reason: string; comment?: string }) =>
      violationsApi.update(id, { action, reason, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] });
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
      setReviewViolationId(null);
    },
  });

  const handleDismiss = (id: string) => {
    setReviewViolationId(id);
    setReviewAction("dismiss");
  };
  const handleDefer = (id: string) => {
    setReviewViolationId(id);
    setReviewAction("defer");
  };
  const handleReviewSubmit = (reason: string, comment?: string) => {
    if (!reviewViolationId) return;
    reviewMutation.mutate({ id: reviewViolationId, action: reviewAction, reason, comment });
  };

  const hasRun = !!run && !runMutation.isPending;
  const canRun = Boolean(plan?.status === "ready" && plan?.elements);

  const breadcrumb = plan ? (
    <Link
      to={`/project/${plan.projectId}`}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Zurück zum Projekt
    </Link>
  ) : null;

  return (
    <div className="max-w-4xl">
      {planLoading || !plan ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-500">Plan wird geladen…</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PageHeader
            title={plan.name}
            description={
              <>
                <span className="block text-slate-500">{plan.fileName} · Status: {plan.status}</span>
                {plan.extractionError && (
                  <span className="block mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {plan.extractionError}
                  </span>
                )}
              </>
            }
            breadcrumb={breadcrumb}
            action={
              canRun && (
                <Button
                  onClick={() => runMutation.mutate()}
                  disabled={runMutation.isPending}
                >
                  {runMutation.isPending ? "Prüfe…" : "Prüflauf starten"}
                </Button>
              )
            }
          />

          {!canRun && plan.status !== "ready" && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Laden Sie eine gültige JSON- oder PDF-Plan-Datei hoch, um die Regelprüfung zu starten.
            </div>
          )}

          {runMutation.isError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {runMutation.error instanceof Error ? runMutation.error.message : String(runMutation.error)}
            </div>
          )}

          {runMutation.isPending && (
            <div className="mb-6">
              <RunAnalysisLoading />
            </div>
          )}

          {hasRun && run && !runMutation.isPending && (
            <>
              <ReportWithExport
                plan={plan}
                run={run}
                planId={planId!}
                onDismiss={handleDismiss}
                onDefer={handleDefer}
                onShowHistory={(id) => setHistoryViolationId(id)}
                isManager={true}
              />
              <ReviewModal
                isOpen={!!reviewViolationId}
                onClose={() => setReviewViolationId(null)}
                action={reviewAction}
                onSubmit={handleReviewSubmit}
                isPending={reviewMutation.isPending}
              />
              <HistoryModal
                isOpen={!!historyViolationId}
                onClose={() => setHistoryViolationId(null)}
                violationId={historyViolationId ?? ""}
                currentStatus={historyData?.currentStatus ?? "open"}
                history={historyData?.history ?? []}
              />
            </>
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
