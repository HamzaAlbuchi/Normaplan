import { useState } from "react";
import { DISMISS_REASONS, DEFER_REASONS } from "../api/client";
import { Button } from "./ui";

export const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  confirmed: "Bestätigt",
  dismissed: "Abgewiesen",
  deferred: "Zurückgestellt",
  resolved: "Behoben",
};

type Action = "confirm" | "dismiss" | "defer" | "resolve";

interface ViolationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: Action;
  onSubmit: (reason?: string, comment?: string) => void;
  isPending?: boolean;
}

const ACTION_CONFIG: Record<Action, { title: string; submitLabel: string; needsReason: boolean }> = {
  confirm: { title: "Verstoß bestätigen", submitLabel: "Bestätigen", needsReason: false },
  resolve: { title: "Verstoß als behoben markieren", submitLabel: "Behoben", needsReason: false },
  dismiss: { title: "Verstoß abweisen", submitLabel: "Abweisen", needsReason: true },
  defer: { title: "Verstoß zurückstellen", submitLabel: "Zurückstellen", needsReason: true },
};

export default function ViolationActionModal({
  isOpen,
  onClose,
  action,
  onSubmit,
  isPending,
}: ViolationActionModalProps) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const config = ACTION_CONFIG[action];
  const reasons = action === "dismiss" ? DISMISS_REASONS : DEFER_REASONS;
  const canSubmit = !config.needsReason || reason.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(config.needsReason ? reason.trim() : undefined, comment.trim() || undefined);
    setReason("");
    setComment("");
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
        <h3 className="text-lg font-semibold text-slate-900">{config.title}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {config.needsReason
            ? "Geben Sie einen Grund an. Die Entscheidung wird protokolliert."
            : "Die Entscheidung wird protokolliert."}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {config.needsReason && (
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-slate-700">
                Grund <span className="text-red-500">*</span>
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required={config.needsReason}
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
          )}
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
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending || !canSubmit} className="flex-1">
              {isPending ? "Wird gespeichert…" : config.submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
