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

export default function RuleScope() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["rules", "metadata"],
    queryFn: () => rulesApi.getMetadata(),
  });

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

  const grouped = groupRulesByCategory(data.rules);
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
