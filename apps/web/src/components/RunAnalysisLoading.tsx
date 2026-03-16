export default function RunAnalysisLoading() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="relative overflow-hidden px-8 py-16">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent)",
            backgroundSize: "200% 100%",
            animation: "run-progress-shimmer 2s ease-in-out infinite",
          }}
        />
        <div className="relative flex flex-col items-center gap-8">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600"
              style={{ animation: "run-spin-slow 1.5s linear infinite" }}
            />
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-blue-500"
                  style={{
                    animation: "run-dot-pulse 0.8s ease-in-out infinite",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-slate-800">Prüfung läuft…</p>
            <p className="mt-1 text-sm text-slate-500">
              Deklarative Regeln und KI-Analyse werden ausgeführt.
            </p>
          </div>
          <div className="w-full max-w-xs h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 animate-pulse"
              style={{ width: "60%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
