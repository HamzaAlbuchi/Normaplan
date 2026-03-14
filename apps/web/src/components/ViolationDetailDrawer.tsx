import { Link } from "react-router-dom";
import type { ViolationListItem } from "../api/client";
import { REASON_LABELS } from "../api/client";
import { STATUS_LABELS } from "./ViolationActionModal";

interface ViolationDetailDrawerProps {
  violation: ViolationListItem | null;
  onClose: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
  onDefer: () => void;
  onResolve: () => void;
  onShowHistory: () => void;
  canReview: boolean;
}

const SEVERITY_LABELS: Record<string, string> = {
  info: "Hinweis",
  warning: "Warnung",
  error: "Kritisch",
  critical: "Kritisch",
};

export default function ViolationDetailDrawer({
  violation,
  onClose,
  onConfirm,
  onDismiss,
  onDefer,
  onResolve,
  onShowHistory,
  canReview,
}: ViolationDetailDrawerProps) {
  if (!violation) return null;

  const status = violation.status;
  const isOpen = status === "open";
  const severityLabel = SEVERITY_LABELS[violation.severity] ?? violation.severity;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-slate-200 bg-white shadow-xl">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Verstoßdetails</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Schließen"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                violation.severity === "critical" || violation.severity === "error"
                  ? "bg-red-100 text-red-800"
                  : violation.severity === "warning"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
              }`}>
                {severityLabel}
              </span>
              <span className="ml-2 inline-flex rounded px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">{violation.title}</h4>
              <p className="mt-1 text-sm text-slate-600">{violation.description}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Projekt / Plan</p>
              <Link
                to={`/project/${violation.projectId}`}
                className="mt-1 block text-sm font-medium text-blue-600 hover:underline"
              >
                {violation.projectName}
              </Link>
              <p className="mt-0.5 text-sm text-slate-600">{violation.planName}</p>
            </div>
            {violation.actualValue != null && violation.requiredValue != null && (
              <p className="text-sm text-slate-600">
                Gemessen: {violation.actualValue} m · Erforderlich: min. {violation.requiredValue} m
              </p>
            )}
            {violation.regulationRef && (
              <p className="text-xs text-slate-500">Referenz: {violation.regulationRef}</p>
            )}
            {violation.elementIds?.length > 0 && (
              <p className="text-xs text-slate-500">Betroffene Elemente: {violation.elementIds.join(", ")}</p>
            )}
            {(status === "dismissed" || status === "deferred") && (violation.reason || violation.comment) && (
              <div className="rounded-lg border border-slate-200 p-3">
                {violation.reason && (
                  <p className="text-sm text-slate-600">Grund: {REASON_LABELS[violation.reason] ?? violation.reason}</p>
                )}
                {violation.comment && (
                  <p className="mt-1 text-sm text-slate-600">Kommentar: {violation.comment}</p>
                )}
                {violation.reviewedBy && (
                  <p className="mt-1 text-xs text-slate-500">
                    {violation.reviewedBy.name || violation.reviewedBy.email} ·{" "}
                    {violation.reviewedAt ? new Date(violation.reviewedAt).toLocaleString("de-DE") : ""}
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-slate-400">
              Erkannt: {new Date(violation.detectedAt).toLocaleString("de-DE")}
            </p>
          </div>
        </div>
        <div className="border-t border-slate-200 p-4 space-y-2">
          {canReview && isOpen && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Bestätigen
              </button>
              <button
                type="button"
                onClick={onDefer}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Zurückstellen
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Abweisen
              </button>
            </div>
          )}
          {canReview && status === "confirmed" && (
            <button
              type="button"
              onClick={onResolve}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Als behoben markieren
            </button>
          )}
          <button
            type="button"
            onClick={onShowHistory}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Verlauf anzeigen
          </button>
        </div>
      </div>
    </div>
  );
}
