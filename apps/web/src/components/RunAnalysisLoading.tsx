import { useState, useEffect, useRef } from "react";

const STAGES = [
  { target: 30, duration: 800, label: "Deklarative Regeln werden geprüft…" },
  { target: 60, duration: 4000, label: "KI-Analyse läuft…" },
  { target: 85, duration: 6000, label: "KI-Analyse läuft…" },
  { target: 95, duration: 10000, label: "Ergebnisse werden verarbeitet…" },
];

export default function RunAnalysisLoading() {
  const [stageIndex, setStageIndex] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = STAGES[stageIndex];
    if (!stage) return;

    const startProgress = stageIndex === 0 ? 0 : STAGES[stageIndex - 1].target;
    const range = stage.target - startProgress;
    const startTime = performance.now();

    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / stage.duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      const rounded = Math.max(0, Math.round(startProgress + range * eased));

      if (barRef.current) barRef.current.style.width = `${rounded}%`;
      if (pctRef.current) pctRef.current.textContent = `${rounded}`;

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (stageIndex < STAGES.length - 1) {
        setStageIndex(stageIndex + 1);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stageIndex]);

  const label = STAGES[stageIndex]?.label ?? STAGES[STAGES.length - 1].label;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="rounded-md bg-side px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber animate-pulse-amber" />
            <div>
              <p className="font-sans text-sm font-medium text-on-dark-primary">{label}</p>
              <p className="mt-1 font-mono text-[9px] text-on-dark-secondary">Prüflauf aktiv</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[8px] uppercase tracking-wide text-on-dark-muted">Fortschritt</p>
            <p className="font-serif text-[44px] font-semibold leading-none text-amber">
              <span ref={pctRef}>0</span>%
            </p>
          </div>
        </div>
        <div className="mt-4 h-[3px] w-full overflow-hidden rounded-sm bg-on-dark-border">
          <div ref={barRef} className="h-full rounded-sm bg-amber" style={{ width: "0%" }} />
        </div>
      </div>
    </div>
  );
}
