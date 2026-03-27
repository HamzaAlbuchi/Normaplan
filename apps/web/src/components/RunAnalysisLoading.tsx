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
  const textRef = useRef<HTMLSpanElement>(null);

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
      if (textRef.current) textRef.current.textContent = `${rounded}`;

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
          <div className="text-center">
            <p className="text-base font-medium text-slate-800">{label}</p>
            <p className="mt-1 text-sm text-slate-500">
              <span ref={textRef}>0</span>% abgeschlossen
            </p>
          </div>
          <div className="w-full max-w-xs h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              ref={barRef}
              className="h-full rounded-full bg-blue-500"
              style={{ width: "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
