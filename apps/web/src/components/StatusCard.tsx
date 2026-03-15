interface StatusCardProps {
  runCount: number;
  warningCount: number;
  errorCount: number;
  title?: string;
  compact?: boolean;
}

export default function StatusCard({ runCount, warningCount, errorCount, title = "Prüfstatus", compact }: StatusCardProps) {
  const total = warningCount + errorCount;
  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;
  const allClear = total === 0;

  const status = allClear ? "ok" : hasErrors ? "error" : "warning";
  const statusConfig = {
    ok: {
      label: "Alles in Ordnung",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
    },
    warning: {
      label: `${warningCount} Warnung${warningCount !== 1 ? "en" : ""}`,
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
    },
    error: {
      label: `${errorCount} Verstoß${errorCount !== 1 ? "e" : ""}${warningCount > 0 ? `, ${warningCount} Warnungen` : ""}`,
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const chartTotal = errorCount + warningCount || 1;
  const errorPct = (errorCount / chartTotal) * 100;
  const warningPct = (warningCount / chartTotal) * 100;

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-5`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`mt-1 font-semibold ${config.text}`}>
            {allClear ? "✓ " : ""}
            {config.label}
          </p>
          {runCount > 0 && (
            <p className="mt-0.5 text-xs text-slate-500">{runCount} Prüfläufe</p>
          )}
        </div>
        {!compact && total > 0 && (
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="flex h-2 w-20 overflow-hidden rounded-full bg-slate-200">
              {errorCount > 0 && (
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${errorPct}%` }}
                  title={`${errorCount} Fehler`}
                />
              )}
              {warningCount > 0 && (
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${warningPct}%` }}
                  title={`${warningCount} Warnungen`}
                />
              )}
            </div>
            <div className="flex gap-3 text-xs">
              {errorCount > 0 && (
                <span className="text-red-600 font-medium">{errorCount} Fehler</span>
              )}
              {warningCount > 0 && (
                <span className="text-amber-600 font-medium">{warningCount} Warnungen</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
