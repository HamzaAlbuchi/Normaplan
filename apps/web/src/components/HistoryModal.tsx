import { REASON_LABELS, type ViolationHistoryEntry } from "../api/client";
import { STATUS_LABELS } from "./ReviewModal";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  violationId: string;
  currentStatus: string;
  history: ViolationHistoryEntry[];
}

export default function HistoryModal({
  isOpen,
  onClose,
  violationId,
  currentStatus,
  history,
}: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Entscheidungsverlauf</h3>
        <p className="mt-1 text-sm text-slate-500">
          Aktueller Status: <strong>{STATUS_LABELS[currentStatus] ?? currentStatus}</strong>
        </p>
        <div className="mt-4 max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Verlaufseinträge.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((h, i) => (
                <li key={h.id} className="border-l-2 border-slate-200 pl-4">
                  <p className="text-sm font-medium text-slate-500">
                    {STATUS_LABELS[h.fromStatus] ?? h.fromStatus} → {STATUS_LABELS[h.toStatus] ?? h.toStatus}
                  </p>
                  {h.reason && <p className="mt-0.5 text-sm text-slate-600">Grund: {REASON_LABELS[h.reason] ?? h.reason}</p>}
                  {h.comment && <p className="mt-0.5 text-sm text-slate-600">Kommentar: {h.comment}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {h.user.name || h.user.email} · {new Date(h.createdAt).toLocaleString("de-DE")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
