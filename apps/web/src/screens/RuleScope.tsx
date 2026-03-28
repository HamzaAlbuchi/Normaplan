import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { rulesApi, type RuleMetadata } from "../api/client";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  STATUS_LABELS,
  RULE_STATUS_OVERLAY,
  SEVERITY_LABELS,
  STATE_NAMES,
  type RuleStatus,
} from "../config/ruleScope";

type ChipKey = "all" | "covered" | "error" | "warning" | "info";

function getRuleStatus(ruleId: string): RuleStatus {
  return RULE_STATUS_OVERLAY[ruleId] ?? "covered";
}

/** Display label for status badge (spec: "Nur Information") */
function statusBadgeLabel(status: RuleStatus): string {
  if (status === "informational") return "Nur Information";
  return STATUS_LABELS[status];
}

function groupRulesByCategory(rules: RuleMetadata[]): Map<string, RuleMetadata[]> {
  const map = new Map<string, RuleMetadata[]>();
  for (const rule of rules) {
    const cat = rule.category || "planning";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(rule);
  }
  return map;
}

/** Primary norm hint per category (short, for header row). */
const CATEGORY_NORM: Record<string, string> = {
  accessibility: "DIN 18040 · LBO",
  escape: "BayBO · Sonderbau",
  fire: "LBO · Brandschutz",
  geometry: "BauO · Belichtung",
  safety: "ASR · Arbeitssicherheit",
  stairs: "DIN 18065",
  planning: "LBO / MBO",
};

const CATEGORY_STYLE: Record<
  string,
  { bg: string; stroke: string; dotClass: string }
> = {
  accessibility: {
    bg: "var(--blue-soft)",
    stroke: "#1E4E80",
    dotClass: "bg-blue",
  },
  escape: {
    bg: "var(--red-soft)",
    stroke: "#B83232",
    dotClass: "bg-red",
  },
  fire: {
    bg: "#FEF0EC",
    stroke: "#C94A1A",
    dotClass: "bg-[#C94A1A]",
  },
  geometry: {
    bg: "var(--green-soft)",
    stroke: "#2A6E47",
    dotClass: "bg-green",
  },
  safety: {
    bg: "var(--amber-soft)",
    stroke: "#9A5010",
    dotClass: "bg-amber",
  },
  planning: {
    bg: "#F0ECFA",
    stroke: "#5B3FA6",
    dotClass: "bg-[#5B3FA6]",
  },
  stairs: {
    bg: "var(--bg2)",
    stroke: "var(--ink2)",
    dotClass: "bg-ink2",
  },
};

function CategoryIcon({ categoryKey }: { categoryKey: string }) {
  const st = CATEGORY_STYLE[categoryKey] ?? CATEGORY_STYLE.planning;
  const stroke = st.stroke;
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm"
      style={{ background: st.bg, borderRadius: 2 }}
      aria-hidden
    >
      {categoryKey === "accessibility" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <circle cx="12" cy="5" r="2" />
          <path d="M12 9v4M8 21h8M12 13v8" strokeLinecap="round" />
        </svg>
      )}
      {categoryKey === "escape" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M4 12h12M14 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {categoryKey === "fire" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <path
            d="M12 3c-2 4-6 5-6 10a6 6 0 1012 0c0-3-2-5-4-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {categoryKey === "geometry" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <rect x="4" y="6" width="16" height="12" rx="1" />
          <path d="M8 10h8M8 14h5" strokeLinecap="round" />
        </svg>
      )}
      {categoryKey === "safety" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z" strokeLinejoin="round" />
        </svg>
      )}
      {categoryKey === "planning" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M6 3h12v18H6z" />
          <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
        </svg>
      )}
      {categoryKey === "stairs" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M4 20h4v-4h4v-4h4V8h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {!["accessibility", "escape", "fire", "geometry", "safety", "planning", "stairs"].includes(categoryKey) && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="1" />
        </svg>
      )}
    </div>
  );
}

function statusBadgeClasses(status: RuleStatus): string {
  switch (status) {
    case "covered":
      return "bg-green-soft text-green";
    case "in_preparation":
      return "bg-amber-soft text-[#9A5010]";
    case "limited":
      return "bg-blue-soft text-blue";
    case "informational":
      return "bg-bg2 text-ink2";
    default:
      return "bg-bg2 text-ink2";
  }
}

function severityBadgeClasses(sev: string | undefined): string {
  switch (sev) {
    case "error":
      return "bg-red-soft text-red";
    case "warning":
      return "bg-amber-soft text-[#9A5010]";
    case "info":
      return "bg-bg2 text-ink3";
    default:
      return "bg-bg2 text-ink3";
  }
}

function severityBadgeLabel(sev: string | undefined): string {
  if (!sev) return "—";
  return SEVERITY_LABELS[sev] ?? sev;
}

function RuleCard({ rule }: { rule: RuleMetadata }) {
  const status = getRuleStatus(rule.id);
  const severity = rule.checks?.[0]?.severity;
  const allStates =
    rule.applicableStates?.length === 1 && rule.applicableStates[0] === "ALL";
  const statesLabel = allStates
    ? "Alle Bundesländer"
    : rule.applicableStates?.map((s) => STATE_NAMES[s] ?? s).join(", ") ?? "";

  return (
    <div
      className="rule-card grid cursor-default grid-cols-[1fr_auto] gap-2.5 bg-card px-4 py-3 transition-colors hover:bg-white"
      data-cat-card
    >
      <div className="min-w-0">
        <p className="mb-0.5 font-sans text-xs font-semibold text-ink">{rule.name}</p>
        <p className="mb-1.5 font-mono text-[9px] leading-relaxed text-ink2">{rule.description}</p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {rule.regulationRef && (
            <span className="font-mono text-[9px] text-ink3">{rule.regulationRef}</span>
          )}
          {statesLabel && (
            <span
              className={`font-mono text-[8px] ${allStates ? "text-ink3" : "text-amber"}`}
              title={allStates ? undefined : "Länderspezifisch – eingeschränkte Abdeckung"}
            >
              {statesLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span
          className={`font-mono text-[8px] font-medium uppercase ${statusBadgeClasses(status)}`}
          style={{ borderRadius: 2, padding: "2px 7px" }}
        >
          {statusBadgeLabel(status)}
        </span>
        {severity && (
          <span
            className={`font-mono text-[7px] font-medium uppercase ${severityBadgeClasses(severity)}`}
            style={{ borderRadius: 2, padding: "2px 6px" }}
          >
            {severityBadgeLabel(severity)}
          </span>
        )}
      </div>
    </div>
  );
}

function passesChips(rule: RuleMetadata, chips: Set<ChipKey>): boolean {
  if (chips.has("all") || chips.size === 0) return true;
  const parts: boolean[] = [];
  if (chips.has("covered")) parts.push(getRuleStatus(rule.id) === "covered");
  if (chips.has("error")) parts.push(rule.checks?.[0]?.severity === "error");
  if (chips.has("warning")) parts.push(rule.checks?.[0]?.severity === "warning");
  if (chips.has("info")) parts.push(rule.checks?.[0]?.severity === "info");
  if (parts.length === 0) return true;
  return parts.some(Boolean);
}

function filterBySearch(rule: RuleMetadata, q: string): boolean {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  return (
    rule.name.toLowerCase().includes(n) ||
    rule.description.toLowerCase().includes(n) ||
    (rule.regulationRef?.toLowerCase().includes(n) ?? false)
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-2.5 py-1 font-mono text-[9px] transition-colors ${
        active
          ? "border-ink bg-ink text-bg"
          : "border-border2 bg-transparent text-ink2 hover:border-ink2 hover:text-ink"
      }`}
      style={{ borderRadius: 2 }}
    >
      {children}
    </button>
  );
}

function SidePanel({
  title,
  subtitle,
  children,
  delayMs = 0,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  delayMs?: number;
}) {
  return (
    <section
      className="rule-scope-rpanel overflow-hidden rounded-md border border-border bg-card"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="border-b border-border bg-white px-4 py-3">
        <h3 className="font-sans text-[10px] font-bold uppercase tracking-[1.2px] text-ink">{title}</h3>
        <p className="mt-0.5 font-mono text-[9px] text-ink3">{subtitle}</p>
      </div>
      <div className="px-0 py-0">{children}</div>
    </section>
  );
}

export default function RuleScope() {
  const [chips, setChips] = useState<Set<ChipKey>>(() => new Set(["all"]));
  const [search, setSearch] = useState("");
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleChip = useCallback((key: ChipKey) => {
    setChips((prev) => {
      const next = new Set(prev);
      if (key === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (next.size === 0) return new Set(["all"]);
      return next;
    });
  }, []);

  const scrollToCategory = useCallback((catKey: string) => {
    catRefs.current[catKey]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rules", "metadata"],
    queryFn: () => rulesApi.getMetadata(),
  });

  const allRules = data?.rules ?? [];

  const chipCounts = useMemo(() => {
    const n = allRules.length;
    const covered = allRules.filter((r) => getRuleStatus(r.id) === "covered").length;
    const err = allRules.filter((r) => r.checks?.[0]?.severity === "error").length;
    const warn = allRules.filter((r) => r.checks?.[0]?.severity === "warning").length;
    const info = allRules.filter((r) => r.checks?.[0]?.severity === "info").length;
    return { all: n, covered, error: err, warning: warn, info };
  }, [allRules]);

  const stats = useMemo(() => {
    const total = allRules.length;
    const cats = new Set(allRules.map((r) => r.category || "planning")).size;
    const covered = allRules.filter((r) => getRuleStatus(r.id) === "covered").length;
    const inPrep = allRules.filter((r) => getRuleStatus(r.id) === "in_preparation").length;
    return { total, categories: cats, covered, inPrep };
  }, [allRules]);

  const filteredRules = useMemo(() => {
    return allRules.filter((r) => passesChips(r, chips) && filterBySearch(r, search));
  }, [allRules, chips, search]);

  const grouped = useMemo(() => groupRulesByCategory(filteredRules), [filteredRules]);

  const orderedCategories = useMemo(() => {
    const keys = [...CATEGORY_ORDER, ...[...grouped.keys()].filter((k) => !CATEGORY_ORDER.includes(k))];
    return keys.filter((k) => grouped.has(k) && (grouped.get(k)?.length ?? 0) > 0);
  }, [grouped]);

  const jumpNavCategories = useMemo(() => {
    const g = groupRulesByCategory(allRules);
    const keys = [...CATEGORY_ORDER, ...[...g.keys()].filter((k) => !CATEGORY_ORDER.includes(k))];
    return keys.filter((k) => (g.get(k)?.length ?? 0) > 0);
  }, [allRules]);

  const categoryCounts = useMemo(() => {
    const g = groupRulesByCategory(allRules);
    const m: Record<string, number> = {};
    for (const k of g.keys()) m[k] = g.get(k)!.length;
    return m;
  }, [allRules]);

  const standLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date()),
    []
  );

  if (isLoading) {
    return (
      <div className="p-7">
        <p className="font-mono text-[10px] text-ink3">Lade Prüfregeln …</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-7">
        <p className="font-mono text-[10px] text-red">Die Prüfregeln konnten nicht geladen werden.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[420px] max-h-[calc(100vh-5rem)] flex-col overflow-hidden lg:-mx-7">
      <div
        className="grid min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{ gridTemplateColumns: "1fr 260px" }}
      >
        <div className="rule-scope-left min-h-0 overflow-y-auto" style={{ padding: 28 }}>
          <header
            className="rule-scope-hero mb-6 rounded-md"
            style={{ background: "var(--side)", padding: "24px 28px" }}
          >
            <p
              className="mb-1 font-mono text-[9px] uppercase tracking-[2px]"
              style={{ color: "#3A3A2A" }}
            >
              Regelwerk · Stand {standLabel}
            </p>
            <h1
              className="mb-2 font-serif text-[28px] font-semibold tracking-[-0.5px] text-[#F4F1EB]"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {stats.total} Prüfregeln abgedeckt
            </h1>
            <p
              className="mb-4 font-mono text-[10px] leading-snug"
              style={{ color: "#3A3A2A", lineHeight: 1.6, marginBottom: 18 }}
            >
              BauPilot bündelt ausgewählte Regeln aus den wichtigsten Kapiteln der Bauordnungen und begleitenden
              Normen. Umfang und Genauigkeit wachsen mit jedem Release — nachfolgend der vollständige Katalog nach
              Kategorie.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Regeln gesamt", value: stats.total, tint: "#F4F1EB" },
                { label: "Kategorien", value: stats.categories, tint: "#F4F1EB" },
                { label: "Abgedeckt", value: stats.covered, tint: "#7EC89A" },
                { label: "In Vorbereitung", value: stats.inPrep, tint: "#E8B86A" },
              ].map((cell) => (
                <div
                  key={cell.label}
                  className="rounded-sm px-3 py-2 text-center"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 2,
                  }}
                >
                  <p
                    className="font-serif text-[26px] font-semibold leading-none"
                    style={{ fontFamily: "Fraunces, serif", color: cell.tint }}
                  >
                    {cell.value}
                  </p>
                  <p className="mt-1 font-mono text-[8px] uppercase" style={{ color: "#3A3A2A" }}>
                    {cell.label}
                  </p>
                </div>
              ))}
            </div>
          </header>

          <div className="mb-5 flex flex-wrap items-center gap-1.5" style={{ gap: 6, marginBottom: 20 }}>
            <Chip active={chips.has("all")} onClick={() => toggleChip("all")}>
              Alle ({chipCounts.all})
            </Chip>
            <Chip active={chips.has("covered")} onClick={() => toggleChip("covered")}>
              Abgedeckt ({chipCounts.covered})
            </Chip>
            <Chip active={chips.has("error")} onClick={() => toggleChip("error")}>
              Fehler ({chipCounts.error})
            </Chip>
            <Chip active={chips.has("warning")} onClick={() => toggleChip("warning")}>
              Hinweis ({chipCounts.warning})
            </Chip>
            <Chip active={chips.has("info")} onClick={() => toggleChip("info")}>
              Information ({chipCounts.info})
            </Chip>
            <input
              type="search"
              placeholder="Regel suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-auto w-[180px] rounded-sm border border-border2 bg-card px-2 py-1 font-mono text-[10px] text-ink placeholder:text-ink3 focus:border-amber focus:outline-none"
              style={{ borderRadius: 2 }}
              aria-label="Regel suchen"
            />
          </div>

          {orderedCategories.length === 0 ? (
            <p className="py-12 text-center font-mono text-[10px] text-ink3">
              Keine Regeln entsprechen den aktuellen Filtern.
            </p>
          ) : (
            orderedCategories.map((catKey, idx) => {
              const rules = grouped.get(catKey)!;
              const label = CATEGORY_LABELS[catKey] ?? catKey;
              const norm = CATEGORY_NORM[catKey] ?? "Normen siehe Regeln";
              return (
                <section
                  key={catKey}
                  ref={(el) => {
                    catRefs.current[catKey] = el;
                  }}
                  data-cat={catKey}
                  className="rule-scope-cat mb-8"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div
                    className="mb-3 flex items-center gap-3 border-b border-border pb-2.5"
                    style={{ marginBottom: 12, paddingBottom: 10 }}
                  >
                    <CategoryIcon categoryKey={catKey} />
                    <h2 className="font-sans text-[13px] font-bold text-ink">{label}</h2>
                    <span className="ml-auto text-right font-mono text-[9px] text-ink3">
                      {rules.length} Regeln · {norm}
                    </span>
                  </div>
                  <div
                    className="flex flex-col gap-px overflow-hidden rounded-md border border-border bg-border"
                    style={{ borderRadius: 3 }}
                  >
                    {rules.map((rule) => (
                      <RuleCard key={rule.id} rule={rule} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <aside
          className="rule-scope-right min-h-0 overflow-y-auto"
          style={{ padding: "28px 20px 28px 0", display: "flex", flexDirection: "column", gap: 16 }}
        >
          <SidePanel title="Kategorien" subtitle="Schnell zur Kategorie" delayMs={0}>
            <ul className="py-0">
              {jumpNavCategories.map((catKey) => {
                const label = CATEGORY_LABELS[catKey] ?? catKey;
                const st = CATEGORY_STYLE[catKey] ?? CATEGORY_STYLE.planning;
                const n = categoryCounts[catKey] ?? 0;
                return (
                  <li key={catKey} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => scrollToCategory(catKey)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-bg"
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dotClass}`} style={{ width: 6, height: 6 }} />
                      <span className="min-w-0 flex-1 truncate font-sans text-[11px] font-medium text-ink">{label}</span>
                      <span
                        className="shrink-0 rounded-sm bg-bg2 px-1.5 py-px font-mono text-[9px] text-ink2"
                        style={{ borderRadius: 2, padding: "1px 6px" }}
                      >
                        {n}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </SidePanel>

          <SidePanel title="Statusbedeutung" subtitle="Lesen der Regelkarten" delayMs={40}>
            <ul className="divide-y divide-border px-4 py-2">
              {(
                [
                  ["Abgedeckt", "Regel ist implementiert und wird im Prüflauf ausgewertet."],
                  ["In Vorbereitung", "Regel ist dokumentiert; technische Umsetzung oder Tests laufen noch."],
                  ["Eingeschränkt", "Gilt nur für bestimmte Bundesländer oder Sonderfälle — siehe Geltungsbereich."],
                  ["Nur Information", "Kein harter Norm-Check; Hinweis oder Empfehlung ohne automatischen Befund."],
                ] as const
              ).map(([badge, text]) => (
                <li key={badge} className="flex gap-2 py-3 first:pt-0 last:pb-0">
                  <span
                    className="mt-0.5 shrink-0 self-start font-mono text-[8px] font-medium uppercase text-ink2"
                    style={{
                      borderRadius: 2,
                      padding: "2px 6px",
                      background: "var(--bg2)",
                    }}
                  >
                    {badge}
                  </span>
                  <p className="font-mono text-[9px] leading-snug text-ink2" style={{ lineHeight: 1.5 }}>
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </SidePanel>

          <SidePanel title="Schweregrade" subtitle="Bedeutung für den Befund" delayMs={80}>
            <ul className="divide-y divide-border px-4 py-2">
              {(
                [
                  ["Fehler", "Klarer Bezug zur Norm; Abweichung sollte fachlich geprüft werden."],
                  ["Hinweis", "Mögliche Abweichung oder Grenzfall — Kontext und Planung entscheiden."],
                  ["Information", "Empfehlung ohne zwingenden Normzwang."],
                ] as const
              ).map(([badge, text]) => (
                <li key={badge} className="flex gap-2 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`mt-0.5 shrink-0 self-start font-mono text-[7px] font-medium uppercase ${
                      badge === "Fehler"
                        ? "bg-red-soft text-red"
                        : badge === "Hinweis"
                          ? "bg-amber-soft text-[#9A5010]"
                          : "bg-bg2 text-ink3"
                    }`}
                    style={{ borderRadius: 2, padding: "2px 6px" }}
                  >
                    {badge}
                  </span>
                  <p className="font-mono text-[9px] leading-snug text-ink2" style={{ lineHeight: 1.5 }}>
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </SidePanel>

          <SidePanel title="Einschränkungen" subtitle="Transparente Grenzen" delayMs={120}>
            <ul className="space-y-2 px-4 py-3">
              {[
                "Nicht alle Sonderbau- oder nutzungsspezifischen Vorschriften werden automatisch geprüft.",
                "Länderspezifische Abweichungen vom MBO sind nur teilweise abgebildet.",
                "KI-gestützte Extraktion aus PDF/IFC/DWG kann je nach Dateiqualität eine manuelle Nachkontrolle erfordern.",
                "Ersetzt keine Rechtsauskunft, kein Fachgutachten und keine Baugenehmigung.",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink3" style={{ width: 4, height: 4 }} />
                  <p className="font-mono text-[9px] leading-relaxed text-ink2" style={{ lineHeight: 1.6 }}>
                    {line}
                  </p>
                </li>
              ))}
            </ul>
          </SidePanel>

          <SidePanel title="Geplante Erweiterungen" subtitle="Nächste Schritte" delayMs={160}>
            <ul className="divide-y divide-border px-4 py-2">
              {(
                [
                  ["In Vorbereitung", "Erweiterte Sonderbauvorschriften"],
                  ["In Prüfung", "Weitere LBO-spezifische Anpassungen"],
                  ["In Vorbereitung", "Zusätzliche DIN-Normen für technische Ausstattung"],
                ] as const
              ).map(([badge, name]) => (
                <li key={name} className="flex flex-wrap items-center gap-2 py-3 first:pt-0 last:pb-0">
                  <span className="rounded-sm bg-amber-soft px-1.5 py-px font-mono text-[8px] font-medium uppercase text-[#9A5010]">
                    {badge}
                  </span>
                  <span className="font-sans text-[11px] font-medium text-ink">{name}</span>
                </li>
              ))}
            </ul>
          </SidePanel>
        </aside>
      </div>
    </div>
  );
}
