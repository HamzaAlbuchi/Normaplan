import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { rulesApi, type RuleMetadata } from "../api/client";
import {
  Card,
  CardHeader,
  CardContent,
  PageHeader,
  Badge,
} from "../components/ui";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  STATUS_LABELS,
  RULE_STATUS_OVERLAY,
  SEVERITY_LABELS,
  STATE_NAMES,
  type RuleStatus,
} from "../config/ruleScope";

const selectClass =
  "h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function getRuleStatus(ruleId: string): RuleStatus {
  return RULE_STATUS_OVERLAY[ruleId] ?? "covered";
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

function RuleCard({ rule }: { rule: RuleMetadata }) {
  const status = getRuleStatus(rule.id);
  const severity = rule.checks?.[0]?.severity;
  const applicableStates =
    rule.applicableStates?.length === 1 && rule.applicableStates[0] === "ALL"
      ? "Alle Bundesländer"
      : rule.applicableStates
          ?.map((s) => STATE_NAMES[s] ?? s)
          .join(", ");

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{rule.name}</span>
            <Badge
              variant={
                status === "covered"
                  ? "success"
                  : status === "limited"
                    ? "warning"
                    : "default"
              }
            >
              {STATUS_LABELS[status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">{rule.description}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="font-mono text-slate-400" title="Regel-ID">
              {rule.id}
            </span>
            {rule.regulationRef && (
              <span title="Norm / Referenz">{rule.regulationRef}</span>
            )}
            {applicableStates && (
              <span title="Geltungsbereich">{applicableStates}</span>
            )}
            {severity && (
              <span title="Schweregrad">
                {SEVERITY_LABELS[severity] ?? severity}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  categoryKey,
  rules,
}: {
  categoryKey: string;
  rules: RuleMetadata[];
}) {
  const label = CATEGORY_LABELS[categoryKey] ?? categoryKey;
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">{label}</h2>
      <div className="space-y-3">
        {rules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} />
        ))}
      </div>
    </section>
  );
}

function filterRules(
  rules: RuleMetadata[],
  filters: { category?: string; severity?: string; status?: string; search?: string }
): RuleMetadata[] {
  return rules.filter((rule) => {
    if (filters.category && (rule.category || "planning") !== filters.category) return false;
    const sev = rule.checks?.[0]?.severity;
    if (filters.severity && sev !== filters.severity) return false;
    const status = getRuleStatus(rule.id);
    if (filters.status && status !== filters.status) return false;
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const match =
        rule.name.toLowerCase().includes(q) ||
        rule.description.toLowerCase().includes(q) ||
        rule.id.toLowerCase().includes(q) ||
        (rule.regulationRef?.toLowerCase().includes(q) ?? false);
      if (!match) return false;
    }
    return true;
  });
}

export default function RuleScope() {
  const [filters, setFilters] = useState<{
    category?: string;
    severity?: string;
    status?: string;
    search?: string;
  }>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["rules", "metadata"],
    queryFn: () => rulesApi.getMetadata(),
  });

  const filteredRules = useMemo(() => {
    if (!data?.rules) return [];
    return filterRules(data.rules, filters);
  }, [data?.rules, filters]);

  const categories = useMemo(() => {
    const cats = new Set(data?.rules?.map((r) => r.category || "planning") ?? []);
    return [...CATEGORY_ORDER, ...[...cats].filter((c) => !CATEGORY_ORDER.includes(c))];
  }, [data?.rules]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Prüfumfang" />
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Lade Prüfregeln …</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Prüfumfang" />
        <Card>
          <CardContent>
            <p className="text-sm text-red-600">
              Die Prüfregeln konnten nicht geladen werden.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = groupRulesByCategory(filteredRules);
  const orderedCategories = CATEGORY_ORDER.filter((k) => grouped.has(k));
  const otherCategories = [...grouped.keys()].filter(
    (k) => !CATEGORY_ORDER.includes(k)
  );

  return (
    <div>
      <PageHeader
        title="Aktuell abgedeckte Prüfregeln"
        description={
          <>
            <p>
              BauPilot deckt in der aktuellen Version ausgewählte Prüfregeln aus
              zentralen Themenbereichen ab. Der Prüfumfang wird schrittweise
              erweitert. Die Ergebnisse dienen als strukturierter Vorab-Check und
              ersetzen keine fachliche oder behördliche Prüfung.
            </p>
          </>
        }
      />

      <div className="mb-8 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Suchen (Name, Beschreibung, Regel-ID, Norm…)"
          value={filters.search ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          className={`${selectClass} min-w-[220px]`}
        />
        <select
          value={filters.category ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}
          className={selectClass}
        >
          <option value="">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c}
            </option>
          ))}
        </select>
        <select
          value={filters.severity ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value || undefined }))}
          className={selectClass}
        >
          <option value="">Alle Schweregrade</option>
          {Object.entries(SEVERITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={filters.status ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          className={selectClass}
        >
          <option value="">Alle Status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500 self-center">
          {filteredRules.length} {filteredRules.length === 1 ? "Regel" : "Regeln"}
        </span>
        {(filters.category || filters.severity || filters.status || filters.search) && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {filteredRules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-600">Keine Regeln entsprechen den gewählten Filtern.</p>
            <button
              type="button"
              onClick={() => setFilters({})}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Filter zurücksetzen
            </button>
          </CardContent>
        </Card>
      ) : (
      <div className="space-y-8">
        {orderedCategories.map((cat) => (
          <CategorySection
            key={cat}
            categoryKey={cat}
            rules={grouped.get(cat)!}
          />
        ))}
        {otherCategories.map((cat) => (
          <CategorySection
            key={cat}
            categoryKey={cat}
            rules={grouped.get(cat)!}
          />
        ))}
      </div>
      )}

      <section className="mt-12">
        <Card>
          <CardHeader
            title="Umfang und Grenzen"
            description="Transparenz zum aktuellen Prüfumfang"
          />
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>
              Nicht alle bauordnungsrechtlichen und technischen Anforderungen sind
              derzeit automatisiert abgedeckt. Der automatisierte Prüfumfang wird
              schrittweise erweitert.
            </p>
            <p>
              Nicht alle Sonderbau- oder nutzungsspezifischen Regelungen sind
              möglicherweise abgebildet. Länderspezifische Unterschiede können je
              nach aktuellem Regelstand nur teilweise berücksichtigt sein.
            </p>
            <p>
              Die KI-gestützte Extraktion aus PDF-, IFC- oder DWG-Dateien kann je
              nach Dateiqualität eine manuelle Überprüfung erfordern.
            </p>
            <p>
              Die Ausgabe dient als strukturierter Vorab-Check und ersetzt keine
              rechtliche Prüfung, kein Fachgutachten und keine behördliche
              Genehmigung.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader
            title="Geplante Erweiterungen"
            description="Kategorien und Regeln in Vorbereitung"
          />
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Badge variant="info">geplant</Badge>
                Erweiterte Sonderbauvorschriften
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="default">in Prüfung</Badge>
                Weitere LBO-spezifische Anpassungen
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="default">in Vorbereitung</Badge>
                Zusätzliche DIN-Normen für technische Ausstattung
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
