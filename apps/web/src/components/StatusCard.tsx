/**
 * Stat cards: 4-column unified border group per design system.
 */

export interface ComplianceOverviewProps {
  errorCount: number;
  warningCount: number;
  infoCount?: number;
  runCount: number;
  lastRunAt?: string | null;
  title?: string;
}

function getStatusMessage(props: ComplianceOverviewProps): string {
  const { errorCount, warningCount } = props;
  const total = errorCount + warningCount;
  if (total === 0) return "Keine kritischen Befunde.";
  if (errorCount > 0)
    return `${errorCount} ${errorCount === 1 ? "kritischer Befund" : "kritische Befunde"} erfordern Prüfung.`;
  if (warningCount > 0)
    return `${warningCount} ${warningCount === 1 ? "Hinweis" : "Hinweise"} zur Überprüfung.`;
  return "Prüfung abgeschlossen.";
}

export default function StatusCard(props: ComplianceOverviewProps) {
  const {
    errorCount = 0,
    warningCount = 0,
    infoCount = 0,
    runCount = 0,
    lastRunAt,
    title = "Prüfergebnisse",
  } = props;

  const totalFindings = errorCount + warningCount + infoCount;
  const hasCritical = errorCount > 0;
  const hasWarnings = warningCount > 0;
  const allClear = totalFindings === 0;
  const barTotal = totalFindings || 1;
  const errorPct = (errorCount / barTotal) * 100;
  const warningPct = (warningCount / barTotal) * 100;
  const infoPct = (infoCount / barTotal) * 100;

  const compliancePct =
    totalFindings === 0 ? 100 : Math.max(0, Math.min(100, 100 - (errorCount * 35 + warningCount * 15) / Math.max(1, runCount || 1)));

  const barFillClass =
    compliancePct < 50 ? "bg-red" : compliancePct < 75 ? "bg-amber" : "bg-green";

  return (
    <div>
      <p className="mb-2 font-mono text-[9px] uppercase tracking-[1.8px] text-ink2">{title}</p>
      <div className="flex overflow-hidden rounded-md border border-border2">
        <div className="group flex min-w-0 flex-1 flex-col border-r border-border bg-card px-4 py-3 transition-colors hover:bg-white">
          <p className="font-mono text-[9px] uppercase tracking-[1.8px] text-ink2">Kritisch</p>
          <p
            className={`mt-1 font-serif text-[38px] font-semibold leading-none tracking-tight ${
              hasCritical ? "text-red" : "text-ink3"
            }`}
          >
            {errorCount}
          </p>
          <div className="mt-2 h-[3px] w-full rounded-sm bg-red" />
        </div>
        <div className="group flex min-w-0 flex-1 flex-col border-r border-border bg-card px-4 py-3 transition-colors hover:bg-white">
          <p className="font-mono text-[9px] uppercase tracking-[1.8px] text-ink2">Warnungen</p>
          <p
            className={`mt-1 font-serif text-[38px] font-semibold leading-none tracking-tight ${
              hasWarnings ? "text-amber" : "text-ink3"
            }`}
          >
            {warningCount}
          </p>
          <div className="mt-2 h-[3px] w-full rounded-sm bg-amber" />
        </div>
        <div className="group flex min-w-0 flex-1 flex-col border-r border-border bg-card px-4 py-3 transition-colors hover:bg-white">
          <p className="font-mono text-[9px] uppercase tracking-[1.8px] text-ink2">Hinweise</p>
          <p className="mt-1 font-serif text-[38px] font-semibold leading-none tracking-tight text-blue">
            {infoCount}
          </p>
          <div className="mt-2 h-[3px] w-full rounded-sm bg-blue" />
        </div>
        <div className="group flex min-w-0 flex-1 flex-col bg-card px-4 py-3 transition-colors hover:bg-white">
          <p className="font-mono text-[9px] uppercase tracking-[1.8px] text-ink2">Prüfläufe</p>
          <p className="mt-1 font-serif text-[38px] font-semibold leading-none tracking-tight text-ink">
            {runCount}
          </p>
          <p className="mt-1 font-mono text-[9px] text-ink3">
            {lastRunAt
              ? `Zuletzt ${new Date(lastRunAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`
              : "—"}
          </p>
          <div className="mt-2 h-[3px] w-full rounded-sm bg-ink2/40" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-[11px] font-semibold text-ink">Befundanteil (geschätzt)</span>
          <span
            className={`font-mono text-[10px] font-medium ${
              compliancePct < 50 ? "text-red" : compliancePct < 75 ? "text-amber" : "text-green"
            }`}
          >
            {Math.round(compliancePct)}%
          </span>
        </div>
        <div className="mt-1 h-[3px] w-full rounded-sm bg-border2">
          <div
            className={`h-full rounded-sm transition-all ${barFillClass}`}
            style={{ width: `${compliancePct}%` }}
          />
        </div>
      </div>

      <p
        className={`mt-3 font-sans text-sm font-medium ${
          allClear ? "text-ink2" : hasCritical ? "text-red" : "text-amber"
        }`}
      >
        {getStatusMessage(props)}
      </p>

      {totalFindings > 0 && (
        <div className="mt-3 flex h-[3px] w-full max-w-xs overflow-hidden rounded-sm bg-bg2">
          {errorCount > 0 && (
            <div className="h-full bg-red" style={{ width: `${errorPct}%` }} title={`${errorCount} kritisch`} />
          )}
          {warningCount > 0 && (
            <div
              className="h-full bg-amber"
              style={{ width: `${warningPct}%` }}
              title={`${warningCount} Warnungen`}
            />
          )}
          {infoCount > 0 && (
            <div className="h-full bg-blue" style={{ width: `${infoPct}%` }} title={`${infoCount} Hinweise`} />
          )}
        </div>
      )}
    </div>
  );
}
