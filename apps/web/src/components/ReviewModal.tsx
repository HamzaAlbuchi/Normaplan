import { useState } from "react";
import { DISMISS_REASONS, DEFER_REASONS } from "../api/client";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "dismiss" | "defer";
  onSubmit: (reason: string, comment?: string) => void;
  isPending?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  confirmed: "Bestätigt",
  dismissed: "Abgewiesen",
  deferred: "Zurückgestellt",
  resolved: "Behoben",
};

export default function ReviewModal({
  isOpen,
  onClose,
  action,
  onSubmit,
  isPending,
}: ReviewModalProps) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  const reasons = action === "dismiss" ? DISMISS_REASONS : DEFER_REASONS;
  const title = action === "dismiss" ? "Verstoß abweisen" : "Verstoß zurückstellen";
  const submitLabel = action === "dismiss" ? "Abweisen" : "Zurückstellen";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(reason.trim(), comment.trim() || undefined);
    setReason("");
    setComment("");
    // Parent closes modal on mutation success
  };

  const handleClose = () => {
    setReason("");
    setComment("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={handleClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {action === "dismiss"
            ? "Geben Sie einen Grund für die Ablehnung an. Die Entscheidung wird protokolliert."
            : "Geben Sie einen Grund für die Zurückstellung an. Die Entscheidung wird protokolliert."}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-slate-700">
              Grund <span className="text-red-500">*</span>
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Bitte wählen…</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-slate-700">
              Kommentar (optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Zusätzliche Anmerkungen…"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending || !reason.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Wird gespeichert…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { STATUS_LABELS };
