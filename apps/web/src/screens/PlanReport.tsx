import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plansApi, runsApi, violationsApi, REASON_LABELS, type Violation, type RunDetail } from "../api/client";
import ReviewModal, { STATUS_LABELS } from "../components/ReviewModal";
import HistoryModal from "../components/HistoryModal";
import RunAnalysisLoading from "../components/RunAnalysisLoading";
import { useAuthStore } from "../store/auth";
import { Badge, Button, Card, CardContent, PageHeader } from "../components/ui";
import { toCanonicalFindings } from "../findings/CanonicalFindingMapper";
import type { CanonicalFinding } from "../findings/canonicalTypes";
import { SOURCE_BADGE_LABELS } from "../findings/canonicalTypes";

const SEVERITY_LABELS: Record<string, string> = {
  error: "Kritisch",
  warning: "Warnungen",
  info: "Hinweise / Empfehlungen",
};

function groupCanonical(findings: CanonicalFinding[]): { error: CanonicalFinding[]; warning: CanonicalFinding[]; info: CanonicalFinding[] } {
  const error: CanonicalFinding[] = [];
  const warning: CanonicalFinding[] = [];
  const info: CanonicalFinding[] = [];
  for (const f of findings) {
    if (f.severity === "error") error.push(f);
    else if (f.severity === "warning") warning.push(f);
    else info.push(f);
  }
  return { error, warning, info };
}

const severityBadgeVariant = (s: string): "critical" | "warning" | "info" | "default" =>
  s === "error" ? "critical" : s === "warning" ? "warning" : s === "info" ? "info" : "default";

const statusBadgeVariant = (s: string): "default" | "warning" | "success" | "info" =>
  s === "deferred" ? "warning" : s === "resolved" ? "success" : s === "confirmed" ? "info" : "default";

function CanonicalFindingCard({
  f,
  violationById,
  onDismiss,
  onDefer,
  onShowHistory,
  isManager,
}: {
  f: CanonicalFinding;
  violationById: Map<string, Violation>;
  onDismiss?: (ids: string[]) => void;
  onDefer?: (ids: string[]) => void;
  onShowHistory?: (id: string) => void;
  isManager?: boolean;
}) {
  const primaryViolation = violationById.get(f.primaryRawId);
  const status = primaryViolation?.status ?? "open";
  const canReview = status === "open" && f.rawSourceFindingIds.length > 0;
  const severityClass =
    f.severity === "error"
      ? "border-l-4 border-red-500 bg-red-50/30"
      : f.severity === "warning"
        ? "border-l-4 border-amber-500 bg-amber-50/30"
        : "border-l-4 border-slate-300 bg-slate-50/50";

  const sourceLabel = SOURCE_BADGE_LABELS[f.primarySource];

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${severityClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase text-slate-500">{f.title}</span>
            <Badge variant={f.primarySource === "AI_ONLY" ? "info" : "default"} className="text-[10px]">
              {sourceLabel}
            </Badge>
            {status !== "open" && (
              <Badge variant={statusBadgeVariant(status)}>{STATUS_LABELS[status] ?? status}</Badge>
            )}
            <Badge variant={severityBadgeVariant(f.severity)}>
              {f.severity === "error" ? "Kritisch" : f.severity === "warning" ? "Warnung" : "Hinweis"}
            </Badge>
          </div>
          <p className="mt-2 text-slate-800">{f.description}</p>
          {f.suggestion && (
            <p className="mt-2 text-sm text-slate-600">
              <strong>Vorschlag:</strong> {f.suggestion}
            </p>
          )}
          {f.reference && (
            <p className="mt-1 text-xs text-slate-400">Referenz: {f.reference}</p>
          )}
        </div>
        {f.measuredValue != null && f.requiredValue != null && (
          <div className="text-right text-sm whitespace-nowrap">
            <span className="text-slate-500">{f.measuredValue} m</span>
            <span className="mx-1">→</span>
            <span className="text-slate-700">min. {f.requiredValue} m</span>
          </div>
        )}
      </div>
      {f.affectedElementIds.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">Betroffene Elemente: {f.affectedElementIds.join(", ")}</p>
      )}
      {(status === "dismissed" || status === "deferred") && primaryViolation && (primaryViolation.reason || primaryViolation.comment) && (
        <p className="mt-2 text-xs text-slate-500">
          {primaryViolation.reason && <span>Grund: {REASON_LABELS[primaryViolation.reason] ?? primaryViolation.reason}</span>}
          {primaryViolation.comment && <span className="block mt-0.5">Kommentar: {primaryViolation.comment}</span>}
          {primaryViolation.decidedAt && (
            <span className="block mt-0.5 text-slate-400">
              Entscheidung: {new Date(primaryViolation.decidedAt).toLocaleString("de-DE")}
            </span>
          )}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 no-print">
        {canReview && onDismiss && (
          <Button variant="secondary" size="sm" onClick={() => onDismiss(f.rawSourceFindingIds)}>
            Abweisen
          </Button>
        )}
        {canReview && onDefer && (
          <Button variant="secondary" size="sm" onClick={() => onDefer(f.rawSourceFindingIds)}>
            Zurückstellen
          </Button>
        )}
        {isManager && f.primaryRawId && onShowHistory && (
          <Button variant="secondary" size="sm" onClick={() => onShowHistory(f.primaryRawId)}>
            Verlauf
          </Button>
        )}
      </div>
    </div>
  );
}

function FindingSection({
  title,
  count,
  findings,
  severity,
  violationById,
  onDismiss,
  onDefer,
  onShowHistory,
  isManager,
}: {
  title: string;
  count: number;
  findings: CanonicalFinding[];
  severity: "error" | "warning" | "info";
  violationById: Map<string, Violation>;
  onDismiss?: (ids: string[]) => void;
  onDefer?: (ids: string[]) => void;
  onShowHistory?: (id: string) => void;
  isManager?: boolean;
}) {
  if (findings.length === 0) return null;
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
        {findings.map((f, i) => (
          <li key={f.canonicalFindingId}>
            <CanonicalFindingCard
              f={f}
              violationById={violationById}
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
  onDismiss?: (ids: string[]) => void;
  onDefer?: (ids: string[]) => void;
  onShowHistory?: (id: string) => void;
  isManager?: boolean;
}) {
  const violations = Array.isArray(run.violations) ? run.violations : [];
  const canonical = toCanonicalFindings(violations);
  const grouped = groupCanonical(canonical);
  const violationById = new Map(violations.filter((v): v is Violation & { id: string } => !!v.id).map((v) => [v.id, v]));

  const handleExportPdf = () => {
    import("../report/exportPdf").then(({ exportReportAsPdf }) => {
      exportReportAsPdf({ plan, run, planId });
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="BauPilot" className="h-16 object-contain flex-shrink-0" />
          <div>
            <h2 className="font-semibold text-slate-800">Prüfbericht – {plan.name}</h2>
            <p className="text-sm text-slate-500 mt-1">
            Geprüft am {run.checkedAt ? new Date(run.checkedAt).toLocaleString("de-DE") : "—"} ·{" "}
            {canonical.length} Befunde ({grouped.error.length} Kritisch, {grouped.warning.length} Warnungen, {grouped.info.length} Hinweise)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
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
        {canonical.length === 0 ? (
          <p className="text-slate-600">Keine Befunde gefunden.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-300">
              <h3 className="text-lg font-semibold text-slate-800">Befunde (kanonisch zusammengeführt)</h3>
              <Badge variant="default">{canonical.length} Befunde</Badge>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              Regelbasierte Prüfung und KI-Analyse zusammengeführt. Quelle: Regelbasiert, AI-gestützt (Regel + KI), AI-only.
            </p>
            <div className="space-y-6">
              <FindingSection
                title={SEVERITY_LABELS.error}
                count={grouped.error.length}
                findings={grouped.error}
                severity="error"
                violationById={violationById}
                onDismiss={onDismiss}
                onDefer={onDefer}
                onShowHistory={onShowHistory}
                isManager={isManager}
              />
              <FindingSection
                title={SEVERITY_LABELS.warning}
                count={grouped.warning.length}
                findings={grouped.warning}
                severity="warning"
                violationById={violationById}
                onDismiss={onDismiss}
                onDefer={onDefer}
                onShowHistory={onShowHistory}
                isManager={isManager}
              />
              <FindingSection
                title={SEVERITY_LABELS.info}
                count={grouped.info.length}
                findings={grouped.info}
                severity="info"
                violationById={violationById}
                onDismiss={onDismiss}
                onDefer={onDefer}
                onShowHistory={onShowHistory}
                isManager={isManager}
              />
            </div>
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
  const [reviewViolationIds, setReviewViolationIds] = useState<string[]>([]);
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
    mutationFn: async ({ ids, action, reason, comment }: { ids: string[]; action: "dismiss" | "defer"; reason: string; comment?: string }) => {
      for (const id of ids) {
        await violationsApi.update(id, { action, reason, comment });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] });
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
      setReviewViolationIds([]);
    },
  });

  const handleDismiss = (ids: string[]) => {
    setReviewViolationIds(ids);
    setReviewAction("dismiss");
  };
  const handleDefer = (ids: string[]) => {
    setReviewViolationIds(ids);
    setReviewAction("defer");
  };
  const handleReviewSubmit = (reason: string, comment?: string) => {
    if (reviewViolationIds.length === 0) return;
    reviewMutation.mutate({ ids: reviewViolationIds, action: reviewAction, reason, comment });
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
                isOpen={reviewViolationIds.length > 0}
                onClose={() => setReviewViolationIds([])}
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
