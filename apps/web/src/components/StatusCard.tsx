/**
 * Compliance Overview Card – enterprise-grade dashboard summary for BauPilot.
 * Displays test results with clear hierarchy, severity visualization, and status messaging.
 */

export interface ComplianceOverviewProps {
  /** Number of critical findings (errors) */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Number of info/suggestion findings (optional). Pass from stats.infoCount. */
  infoCount?: number;
  /** Total number of test runs */
  runCount: number;
  /** Last run timestamp (optional) */
  lastRunAt?: string | null;
  /** Section label */
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

  // Segmented bar: compute widths (normalize to 100% when we have findings)
  const barTotal = totalFindings || 1;
  const errorPct = (errorCount / barTotal) * 100;
  const warningPct = (warningCount / barTotal) * 100;
  const infoPct = (infoCount / barTotal) * 100;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Card header */}
      <div className="border-b border-slate-100 px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </p>
      </div>

      {/* Main content */}
      <div className="px-6 py-5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: metrics */}
          <div className="min-w-0 flex-1 space-y-5">
            {/* Primary metrics */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500">Kritisch</p>
                <p
                  className={`mt-0.5 text-2xl font-semibold tabular-nums ${
                    hasCritical ? "text-red-700" : "text-slate-400"
                  }`}
                >
                  {errorCount}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Warnungen</p>
                <p
                  className={`mt-0.5 text-2xl font-semibold tabular-nums ${
                    hasWarnings ? "text-amber-700" : "text-slate-400"
                  }`}
                >
                  {warningCount}
                </p>
              </div>
              {infoCount !== undefined && infoCount > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Hinweise</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-600">
                    {infoCount}
                  </p>
                </div>
              )}
            </div>

            {/* Supporting metadata */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              {runCount > 0 && (
                <span>{runCount} {runCount === 1 ? "Prüflauf" : "Prüfläufe"}</span>
              )}
              {lastRunAt && (
                <span>
                  Zuletzt: {new Date(lastRunAt).toLocaleDateString("de-DE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            {/* Status sentence */}
            <p
              className={`text-sm font-medium ${
                allClear
                  ? "text-slate-600"
                  : hasCritical
                    ? "text-red-700"
                    : "text-amber-700"
              }`}
            >
              {getStatusMessage(props)}
            </p>
          </div>

          {/* Right: severity visualization */}
          <div className="flex flex-shrink-0 flex-col items-end gap-3 sm:pt-0">
            {totalFindings > 0 ? (
              <>
                {/* Segmented horizontal bar */}
                <div className="flex h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                  {errorCount > 0 && (
                    <div
                      className="h-full bg-red-400 transition-all"
                      style={{ width: `${errorPct}%` }}
                      title={`${errorCount} kritisch`}
                    />
                  )}
                  {warningCount > 0 && (
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${warningPct}%` }}
                      title={`${warningCount} Warnungen`}
                    />
                  )}
                  {infoCount > 0 && (
                    <div
                      className="h-full bg-slate-400 transition-all"
                      style={{ width: `${infoPct}%` }}
                      title={`${infoCount} Hinweise`}
                    />
                  )}
                </div>
                {/* Compact badge group */}
                <div className="flex flex-wrap justify-end gap-2">
                  {errorCount > 0 && (
                    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      {errorCount} kritisch
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {warningCount} Warnung{warningCount !== 1 ? "en" : ""}
                    </span>
                  )}
                  {infoCount > 0 && (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {infoCount} Hinweis{infoCount !== 1 ? "e" : ""}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <div className="flex h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-full rounded-full bg-emerald-200" />
                </div>
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Keine Befunde
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
