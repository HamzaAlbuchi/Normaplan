import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plansApi, runsApi, violationsApi, REASON_LABELS, type Violation, type RunDetail } from "../api/client";
import ReviewModal, { STATUS_LABELS } from "../components/ReviewModal";
import HistoryModal from "../components/HistoryModal";
import RunAnalysisLoading from "../components/RunAnalysisLoading";
import { useAuthStore } from "../store/auth";
import { Badge, Button, Card, CardContent, PageHeader } from "../components/ui";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../config/ruleScope";
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
  const dotColor =
    f.severity === "error" ? "bg-red shadow-[0_0_0_3px_rgba(184,50,50,0.125)]" : f.severity === "warning" ? "bg-amber shadow-[0_0_0_3px_rgba(217,119,42,0.125)]" : "bg-blue shadow-[0_0_0_3px_rgba(30,78,128,0.125)]";

  const sourceLabel = SOURCE_BADGE_LABELS[f.primarySource];

  return (
    <div className="rounded-md border border-border bg-card transition-colors hover:bg-bg print:break-inside-avoid">
      <div className="grid grid-cols-[14px_1fr_auto] gap-3 px-[18px] py-3.5 items-start">
        <span className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${dotColor}`} aria-hidden />
        <div className="min-w-0">
          <p className="font-mono text-[8px] uppercase tracking-wide text-ink3">{f.title}</p>
          <p className="mt-0.5 font-sans text-xs font-semibold text-ink">{f.description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={f.primarySource === "AI_ONLY" ? "info" : "default"}>{sourceLabel}</Badge>
            {status !== "open" && <Badge variant={statusBadgeVariant(status)}>{STATUS_LABELS[status] ?? status}</Badge>}
            <Badge variant={severityBadgeVariant(f.severity)}>
              {f.severity === "error" ? "Kritisch" : f.severity === "warning" ? "Warnung" : "Hinweis"}
            </Badge>
          </div>
          {f.suggestion && (
            <p className="mt-2 font-sans text-sm text-ink2">
              <span className="font-semibold">Vorschlag:</span> {f.suggestion}
            </p>
          )}
          {f.reference && <p className="mt-1 font-mono text-[8px] text-ink3">Referenz: {f.reference}</p>}
          {f.affectedElementIds.length > 0 && (
            <p className="mt-1 font-mono text-[9px] text-ink2">Elemente: {f.affectedElementIds.join(", ")}</p>
          )}
          {(status === "dismissed" || status === "deferred") && primaryViolation && (primaryViolation.reason || primaryViolation.comment) && (
            <p className="mt-2 font-mono text-[9px] text-ink2">
              {primaryViolation.reason && <span>Grund: {REASON_LABELS[primaryViolation.reason] ?? primaryViolation.reason}</span>}
              {primaryViolation.comment && <span className="block mt-0.5">Kommentar: {primaryViolation.comment}</span>}
              {primaryViolation.decidedAt && (
                <span className="block mt-0.5 text-ink3">
                  Entscheidung: {new Date(primaryViolation.decidedAt).toLocaleString("de-DE")}
                </span>
              )}
            </p>
          )}
        </div>
        {f.measuredValue != null && f.requiredValue != null ? (
          <div className="text-right font-mono text-[10px] whitespace-nowrap">
            <span className="text-red">{f.measuredValue} m</span>
            <span className="mx-1 text-ink3">→</span>
            <span className="text-green">min. {f.requiredValue} m</span>
          </div>
        ) : (
          <span />
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border px-[18px] py-3 no-print">
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
  return (
    <section className="rounded-md border border-border bg-card p-4 print:break-inside-avoid">
      <h3 className="mb-0.5 font-sans text-[11px] font-bold uppercase tracking-[1.2px] text-ink">{title}</h3>
      <p className="font-mono text-[9px] text-ink2 mb-4">
        {count} {count === 1 ? "Eintrag" : "Einträge"}
      </p>
      <ul className="space-y-3">
        {findings.map((f, i) => (
          <li key={f.canonicalFindingId} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-up">
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
      exportReportAsPdf({ plan, run, planId }).catch((e) => {
        console.error(e);
        window.alert(e instanceof Error ? e.message : "PDF-Export fehlgeschlagen.");
      });
    });
  };

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-white px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-amber font-sans text-lg font-extrabold text-white" style={{ borderRadius: 3 }}>
            BP
          </div>
          <div className="min-w-0">
            <h2 className="font-sans font-semibold text-ink">Prüfbericht – {plan.name}</h2>
            <p className="mt-1 font-mono text-[9px] text-ink2">
            Geprüft am {run.checkedAt ? new Date(run.checkedAt).toLocaleString("de-DE") : "—"} ·{" "}
            {canonical.length} Befunde ({grouped.error.length} Kritisch, {grouped.warning.length} Warnungen, {grouped.info.length} Hinweise)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          className="rounded-sm border border-border2 bg-transparent px-4 py-2 font-sans text-[11px] font-semibold tracking-wide text-ink hover:border-ink2"
        >
          Als PDF exportieren
        </button>
      </div>
      <div className="p-6">
        <p className="mb-2 font-mono text-[9px] text-ink2">
          Dies ist keine rechtliche Bewertung. Bitte prüfen Sie die Hinweise und beziehen Sie die zuständigen Vorschriften ein.
        </p>
        <p className="mb-6 font-mono text-[9px] text-ink2 no-print">
          <Link to="/pruefumfang" className="text-amber hover:underline">
            Abgedeckte Prüfregeln anzeigen
          </Link>
        </p>
        {canonical.length === 0 ? (
          <p className="font-sans text-sm text-ink2">Keine Befunde gefunden.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b-2 border-border pb-2">
              <h3 className="font-sans text-lg font-semibold text-ink">Befunde (kanonisch zusammengeführt)</h3>
              <Badge variant="default">{canonical.length} Befunde</Badge>
            </div>
            <p className="-mt-2 font-mono text-[9px] text-ink3">
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => plansApi.get(planId!),
    enabled: !!planId,
  });

  const runMutation = useMutation({
    mutationFn: () =>
      runsApi.create(planId!, {
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      }),
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
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink2 transition-colors hover:text-ink"
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
            <p className="text-sm text-ink2">Plan wird geladen…</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PageHeader
            title={plan.name}
            description={
              <>
                <span className="block text-ink2">{plan.fileName} · Status: {plan.status}</span>
                {plan.extractionError && (
                  <span className="mt-2 block rounded-md border border-border2 bg-amber-soft px-3 py-2 text-sm text-amber-ink">
                    {plan.extractionError}
                  </span>
                )}
              </>
            }
            breadcrumb={breadcrumb}
            action={
              canRun && (
                <div className="flex flex-col items-end gap-2">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-ink2 hover:text-ink [&::-webkit-details-marker]:hidden">
                      <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                      {selectedCategories.length > 0 ? (
                        <span className="text-ink">
                          {selectedCategories.length === CATEGORY_ORDER.length
                            ? "Alle Prüfbereiche"
                            : `${selectedCategories.length} von ${CATEGORY_ORDER.length} Prüfbereiche`}
                        </span>
                      ) : (
                        "Prüfbereiche einschränken"
                      )}
                    </summary>
                    <div className="mt-2 min-w-[200px] space-y-2 rounded-md border border-border bg-card p-3">
                      {CATEGORY_ORDER.map((cat) => {
                        const label = CATEGORY_LABELS[cat] ?? cat;
                        const checked = selectedCategories.includes(cat);
                        return (
                          <label
                            key={cat}
                            className="flex cursor-pointer items-center gap-2 text-sm text-ink"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategories((s) => [...s, cat]);
                                } else {
                                  setSelectedCategories((s) => s.filter((c) => c !== cat));
                                }
                              }}
                              className="rounded-sm border-border2 text-amber focus:ring-amber focus:ring-offset-0"
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </details>
                  <Button
                    onClick={() => runMutation.mutate()}
                    disabled={runMutation.isPending}
                  >
                    {runMutation.isPending ? "Prüfe…" : "Prüflauf starten"}
                  </Button>
                </div>
              )
            }
          />

          {!canRun && plan.status !== "ready" && (
            <div className="mb-6 rounded-md border border-border2 bg-amber-soft px-4 py-3 text-sm text-amber-ink">
              Laden Sie eine gültige JSON- oder PDF-Plan-Datei hoch, um die Regelprüfung zu starten.
            </div>
          )}

          {runMutation.isError && (
            <div className="mb-6 rounded-md border border-border2 bg-red-soft px-4 py-3 text-sm text-red">
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
            <div className="rounded-md border border-border bg-card p-12 text-center">
              <p className="text-sm text-ink2">
                Klicken Sie auf „Prüflauf starten“, um die Bauvorschriften-Checks auszuführen.
              </p>
            </div>
          )}

          {runLoading && runId && !run && (
            <div className="rounded-md border border-border bg-card p-12 text-center">
              <p className="text-sm text-ink2">Bericht wird geladen…</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
