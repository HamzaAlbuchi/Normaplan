import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { violationsApi, projectsApi, type ViolationListItem, type ViolationsListParams } from "../api/client";
import { useAuthStore } from "../store/auth";
import ViolationDetailDrawer from "../components/ViolationDetailDrawer";
import ViolationActionModal from "../components/ViolationActionModal";
import HistoryModal from "../components/HistoryModal";
import { STATUS_LABELS } from "../components/ViolationActionModal";

const SEVERITY_LABELS: Record<string, string> = {
  info: "Hinweis",
  warning: "Warnung",
  error: "Kritisch",
  critical: "Kritisch",
};

const QUICK_VIEWS = (userId?: string): { key: string; label: string; params: Partial<ViolationsListParams> }[] => [
  { key: "open", label: "Offene Verstöße", params: { status: "open" } },
  { key: "critical", label: "Kritische Verstöße", params: { severity: "error" } },
  { key: "deferred", label: "Zurückgestellt", params: { status: "deferred" } },
  { key: "dismissed", label: "Abgewiesen", params: { status: "dismissed" } },
  { key: "resolved", label: "Behoben", params: { status: "resolved" } },
  ...(userId ? [{ key: "my", label: "Meine Entscheidungen", params: { reviewedBy: userId } }] : []),
];

function ViolationCard({
  v,
  onClick,
}: {
  v: ViolationListItem;
  onClick: () => void;
}) {
  const severityClass =
    v.severity === "critical" || v.severity === "error"
      ? "border-l-4 border-red-500"
      : v.severity === "warning"
        ? "border-l-4 border-amber-500"
        : "border-l-4 border-slate-300";
  const statusClass =
    v.status === "open"
      ? "bg-slate-100 text-slate-600"
      : v.status === "dismissed"
        ? "bg-slate-100 text-slate-500"
        : v.status === "deferred"
          ? "bg-amber-100 text-amber-800"
          : v.status === "resolved"
            ? "bg-emerald-100 text-emerald-800"
            : "bg-blue-100 text-blue-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-r-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all ${severityClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">{v.ruleName}</span>
            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusClass}`}>
              {STATUS_LABELS[v.status] ?? v.status}
            </span>
            <span className="text-xs text-slate-400">
              {SEVERITY_LABELS[v.severity] ?? v.severity}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900 line-clamp-2">{v.description}</p>
          <p className="mt-1 text-xs text-slate-500">
            {v.projectName} · {v.planName}
          </p>
        </div>
        <span className="flex-shrink-0 text-slate-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </button>
  );
}

export default function Violations() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const quickViews = QUICK_VIEWS(user?.id);
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("projectId");
  const [filters, setFilters] = useState<ViolationsListParams>(() => ({
    sort: "detectedAt",
    order: "desc",
    limit: 50,
    ...(projectIdFromUrl && { projectId: projectIdFromUrl }),
  }));
  const [quickView, setQuickView] = useState<string | null>(() => (projectIdFromUrl ? null : "open"));

  useEffect(() => {
    setFilters((f) => ({ ...f, projectId: projectIdFromUrl ?? undefined }));
    setQuickView(projectIdFromUrl ? null : "open");
  }, [projectIdFromUrl]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ id: string; action: "confirm" | "dismiss" | "defer" | "resolve" } | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const effectiveParams = quickView
    ? { ...filters, ...quickViews.find((q) => q.key === quickView)?.params }
    : filters;

  const { data, isLoading } = useQuery({
    queryKey: ["violations", effectiveParams],
    queryFn: () => violationsApi.list(effectiveParams),
  });

  const { data: selectedViolation } = useQuery({
    queryKey: ["violation", selectedId],
    queryFn: () => violationsApi.get(selectedId!),
    enabled: !!selectedId,
  });

  const { data: historyData } = useQuery({
    queryKey: ["violation-history", historyId],
    queryFn: () => violationsApi.getHistory(historyId!),
    enabled: !!historyId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, action, reason, comment }: { id: string; action: "confirm" | "dismiss" | "defer" | "resolve"; reason?: string; comment?: string }) =>
      violationsApi.update(id, { action, reason, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["violations"] });
      queryClient.invalidateQueries({ queryKey: ["violation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
      setActionModal(null);
    },
  });

  const canReview = true; // Architects, reviewers, managers can review

  const handleAction = (reason?: string, comment?: string) => {
    if (!actionModal) return;
    updateMutation.mutate({
      id: actionModal.id,
      action: actionModal.action,
      reason,
      comment,
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Verstöße</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mögliche Abweichungen von Bauvorschriften – prüfen und bewerten.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {quickViews.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => setQuickView(quickView === q.key ? null : q.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              quickView === q.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={filters.status ?? ""}
          onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value || undefined })); setQuickView(null); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Alle Status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={filters.severity ?? ""}
          onChange={(e) => { setFilters((f) => ({ ...f, severity: e.target.value || undefined })); setQuickView(null); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Alle Schweregrade</option>
          <option value="error">Kritisch</option>
          <option value="warning">Warnung</option>
          <option value="info">Hinweis</option>
        </select>
        <select
          value={filters.projectId ?? ""}
          onChange={(e) => { setFilters((f) => ({ ...f, projectId: e.target.value || undefined })); setQuickView(null); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Alle Projekte</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filters.sort ?? "detectedAt"}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as "detectedAt" | "updatedAt" }))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="detectedAt">Sortiert nach Erkennungsdatum</option>
          <option value="updatedAt">Sortiert nach Aktualisierung</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">Verstöße werden geladen…</p>
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">Keine Verstöße gefunden.</p>
          <p className="mt-1 text-sm text-slate-400">
            <Link to="/" className="text-blue-600 hover:underline">Projekte</Link> prüfen und Prüfläufe starten.
          </p>
        </div>
      ) : (
        <div className="flex gap-6">
          <div className={`min-w-0 flex-1 ${selectedId ? "lg:max-w-xl" : ""}`}>
            <p className="mb-3 text-sm text-slate-500">{data.total} Verstoß{data.total !== 1 ? "e" : ""}</p>
            <ul className="space-y-3">
              {data.items.map((v) => (
                <li key={v.id}>
                  <ViolationCard v={v} onClick={() => setSelectedId(v.id)} />
                </li>
              ))}
            </ul>
          </div>
          {selectedId && (
            <ViolationDetailDrawer
              violation={selectedViolation ?? null}
              onClose={() => setSelectedId(null)}
              onConfirm={() => setActionModal({ id: selectedId, action: "confirm" })}
              onDismiss={() => setActionModal({ id: selectedId, action: "dismiss" })}
              onDefer={() => setActionModal({ id: selectedId, action: "defer" })}
              onResolve={() => setActionModal({ id: selectedId, action: "resolve" })}
              onShowHistory={() => setHistoryId(selectedId)}
              canReview={canReview}
            />
          )}
        </div>
      )}

      {actionModal && (
        <ViolationActionModal
          isOpen
          onClose={() => setActionModal(null)}
          action={actionModal.action}
          onSubmit={handleAction}
          isPending={updateMutation.isPending}
        />
      )}

      <HistoryModal
        isOpen={!!historyId}
        onClose={() => setHistoryId(null)}
        violationId={historyId ?? ""}
        currentStatus={historyData?.currentStatus ?? "open"}
        history={historyData?.history ?? []}
      />

      <p className="mt-10 text-xs text-slate-400">
        Hinweis: Dies sind mögliche Verstöße. Eine behördliche Prüfung wird nicht ersetzt.
      </p>
    </div>
  );
}
