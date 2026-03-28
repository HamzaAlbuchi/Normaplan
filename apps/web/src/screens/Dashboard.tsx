import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  projectsApi,
  organizationsApi,
  authApi,
  PROJECT_TYPES,
  PROJECT_STATUSES,
  type ProjectSummary,
  type ProjectType,
} from "../api/client";
import { useAuthStore } from "../store/auth";
import { Button, Card, CardHeader, CardContent, Input, PageHeader } from "../components/ui";

const STATE_NAMES: Record<string, string> = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Inhaber",
  manager: "Projektleiter",
  architect: "Architekt",
  reviewer: "Prüfer",
  viewer: "Betrachter",
};

function getStripeColor(p: ProjectSummary): string {
  const crit = p.openCriticalCount ?? 0;
  const warn = p.openWarningCount ?? 0;
  if (crit > 0) return "var(--red)";
  if (warn > 0) return "var(--amber)";
  return "var(--green)";
}

function projectStatusBadge(p: ProjectSummary): { label: string; className: string } {
  const s = p.status ?? "ongoing";
  if (s === "ended")
    return {
      label: "Abgeschlossen",
      className: "bg-green-soft text-green",
    };
  if (s === "paused")
    return {
      label: "Pausiert",
      className: "bg-blue-soft text-blue",
    };
  return {
    label: "Laufend",
    className: "bg-amber-soft text-[#9A5010]",
  };
}

function projectMetaLine(p: ProjectSummary): string {
  const zip = p.zipCode?.trim() || "—";
  const land = p.state ? STATE_NAMES[p.state] ?? p.state : "—";
  const typ = p.projectType ? PROJECT_TYPES.find((t) => t.value === p.projectType)?.label ?? p.projectType : "—";
  return `${zip} · ${land} · ${typ}`;
}

export default function Dashboard() {
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectZip, setNewProjectZip] = useState("");
  const [newProjectType, setNewProjectType] = useState<ProjectType>("residential");
  const [newOrgName, setNewOrgName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const orgs = user?.organizations ?? [];
  const canCreateProject = orgs.some((o) => ["owner", "manager"].includes(o.role));
  const defaultOrgId = orgs[0]?.id;

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: () => projectsApi.list(),
    enabled: Boolean(token),
  });

  const createProjectMutation = useMutation({
    mutationFn: ({ name, zipCode, projectType }: { name: string; zipCode: string; projectType: ProjectType }) =>
      projectsApi.create(name, zipCode, projectType, defaultOrgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewProjectName("");
      setNewProjectZip("");
      setNewProjectType("residential");
      setShowCreateForm(false);
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: (name: string) => organizationsApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewOrgName("");
      authApi.getMe().then((u) => useAuthStore.getState().setUser(u)).catch(() => {});
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const zip = newProjectZip.trim();
    if (!newProjectName.trim() || zip.length !== 5) return;
    createProjectMutation.mutate({ name: newProjectName.trim(), zipCode: zip });
  };

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    createOrgMutation.mutate(newOrgName.trim());
  };

  const aggregates = useMemo(() => {
    const totalCritical = projects.reduce((sum, p) => sum + (p.openCriticalCount ?? 0), 0);
    const totalWarnings = projects.reduce((sum, p) => sum + (p.openWarningCount ?? 0), 0);
    const totalRuns = projects.reduce((sum, p) => sum + (p.runCount ?? 0), 0);
    const ongoingCount = projects.filter((p) => (p.status ?? "ongoing") === "ongoing").length;
    const completedCount = projects.filter((p) => p.status === "ended").length;
    const affectedProjectCount = projects.filter((p) => (p.openCriticalCount ?? 0) > 0).length;
    const lastRunDate = projects
      .map((p) => p.lastRunAt)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    return {
      totalCritical,
      totalWarnings,
      totalRuns,
      ongoingCount,
      completedCount,
      affectedProjectCount,
      lastRunDate,
    };
  }, [projects]);

  if (orgs.length === 0) {
    return (
      <div>
        <PageHeader
          title="Büro anlegen"
          description="Erstellen Sie Ihr Architekturbüro, um Projekte und Prüfläufe zu verwalten."
        />
        <Card className="max-w-md">
          <CardContent>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <Input
                label="Büroname"
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="z. B. Muster Architekten"
              />
              <Button type="submit" disabled={createOrgMutation.isPending || !newOrgName.trim()}>
                {createOrgMutation.isPending ? "Wird erstellt…" : "Büro anlegen"}
              </Button>
            </form>
            {createOrgMutation.isError && (
              <p className="mt-4 font-mono text-sm text-red">
                {createOrgMutation.error instanceof Error ? createOrgMutation.error.message : "Fehler"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const lastRunLabel = aggregates.lastRunDate
    ? new Date(aggregates.lastRunDate).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          canCreateProject
            ? "Überblick über offene Befunde und Projekte — kurz und ohne Umwege."
            : "Ihre zugewiesenen Projekte und Prüfstatus."
        }
        breadcrumb={
          orgs.length > 0 ? (
            <p className="mb-3 font-mono text-[9px] text-ink2">
              {orgs.map((o, i) => (
                <span key={o.id}>
                  {i > 0 && " · "}
                  <Link to={`/org/${o.id}`} className="text-amber hover:underline">
                    {o.name} ({ROLE_LABELS[o.role] ?? o.role})
                  </Link>
                </span>
              ))}
            </p>
          ) : null
        }
      />

      {!isLoading && projects.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div
            className={`dashboard-attention-banner border-b border-border px-5 py-4 ${
              aggregates.totalCritical > 0 ? "bg-red-soft/50" : aggregates.totalWarnings > 0 ? "bg-amber-soft/40" : ""
            }`}
          >
            <p className="font-mono text-[8px] uppercase tracking-[1.8px] text-ink3">Über alle Projekte</p>
            {aggregates.totalCritical > 0 ? (
              <p className="mt-2 font-sans text-[13px] font-semibold leading-snug text-red">
                {aggregates.totalCritical}{" "}
                {aggregates.totalCritical === 1 ? "kritischer Befund offen" : "kritische Befunde offen"}
                {aggregates.affectedProjectCount > 0
                  ? ` · in ${aggregates.affectedProjectCount} ${
                      aggregates.affectedProjectCount === 1 ? "Projekt" : "Projekten"
                    }`
                  : ""}
                .
              </p>
            ) : aggregates.totalWarnings > 0 ? (
              <p className="mt-2 font-sans text-[13px] font-semibold leading-snug text-amber-ink">
                Keine kritischen Befunde offen · {aggregates.totalWarnings}{" "}
                {aggregates.totalWarnings === 1 ? "Warnung" : "Warnungen"} zur Prüfung.
              </p>
            ) : (
              <p className="mt-2 font-sans text-[13px] font-semibold leading-snug text-green">
                Keine offenen kritischen Befunde oder Warnungen — gemessen an allen zugänglichen Prüfläufen.
              </p>
            )}
          </div>
          <div className="dashboard-agg-stats grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-wide text-ink3">Kritisch offen</p>
              <p className="mt-0.5 font-serif text-xl font-semibold text-red" style={{ fontFamily: "Fraunces, serif" }}>
                {aggregates.totalCritical}
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-wide text-ink3">Warnungen offen</p>
              <p className="mt-0.5 font-serif text-xl font-semibold text-amber" style={{ fontFamily: "Fraunces, serif" }}>
                {aggregates.totalWarnings}
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-wide text-ink3">Prüfläufe gesamt</p>
              <p className="mt-0.5 font-serif text-xl font-semibold text-ink" style={{ fontFamily: "Fraunces, serif" }}>
                {aggregates.totalRuns}
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-wide text-ink3">Letzter Lauf</p>
              <p className="mt-0.5 font-mono text-[11px] font-medium text-ink">{lastRunLabel}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="font-mono text-[9px] text-ink2">
                {aggregates.ongoingCount} laufend · {aggregates.completedCount} abgeschlossen · Summen beziehen sich auf
                alle {projects.length} {projects.length === 1 ? "Projekt" : "Projekte"} in dieser Ansicht.
              </p>
            </div>
          </div>
        </div>
      )}

      {canCreateProject && showCreateForm && (
        <Card>
          <CardHeader title="Neues Projekt" description="Projekt anlegen und Grundrisse hochladen." />
          <CardContent>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Input
                    label="Projektname"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Projektname eingeben"
                  />
                </div>
                <div className="w-full sm:w-28">
                  <Input
                    label="PLZ"
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={newProjectZip}
                    onChange={(e) => setNewProjectZip(e.target.value.replace(/\D/g, ""))}
                    placeholder="80331"
                  />
                </div>
                <div className="w-full sm:w-44">
                  <label className="mb-1.5 block font-sans text-sm font-medium text-ink">Projekttyp</label>
                  <select
                    value={newProjectType}
                    onChange={(e) => setNewProjectType(e.target.value as ProjectType)}
                    className="h-9 w-full rounded-sm border border-border2 bg-card px-3 font-sans text-sm text-ink focus:border-ink2 focus:outline-none"
                  >
                    {PROJECT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={createProjectMutation.isPending || !newProjectName.trim() || newProjectZip.length !== 5} size="lg">
                {createProjectMutation.isPending ? "Wird erstellt…" : "Projekt anlegen"}
              </Button>
            </form>
            {createProjectMutation.isError && (
              <p className="mt-4 font-mono text-sm text-red">
                {createProjectMutation.error instanceof Error ? createProjectMutation.error.message : "Fehler"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canCreateProject && projects.length > 0 && !showCreateForm && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="rounded-sm border border-border2 bg-transparent px-3 py-1.5 font-sans text-[11px] font-semibold tracking-wide text-ink hover:border-ink2"
          >
            + Projekt anlegen
          </button>
        </div>
      )}

      <div>
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[1.2px] text-ink">Projekte</h2>
      </div>

      {isLoading ? (
        <div className="rounded-md border border-border bg-card py-12 text-center">
          <p className="font-mono text-sm text-ink2">Projekte werden geladen…</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-sm border border-border bg-card py-10 px-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-bg2 text-lg text-ink3">
            ⊕
          </div>
          <p className="mb-1 font-sans text-[13px] font-semibold text-ink">Noch keine Projekte angelegt</p>
          <p className="mb-4 font-mono text-[9px] text-ink3">
            {canCreateProject
              ? "Erstellen Sie Ihr erstes Projekt und laden Sie einen Grundriss hoch."
              : "Sie haben noch keine zugewiesenen Projekte."}
          </p>
          {canCreateProject && (
            <Button type="button" variant="primary" onClick={() => setShowCreateForm(true)}>
              + Erstes Projekt anlegen
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((p) => {
            const stripe = getStripeColor(p);
            const badge = projectStatusBadge(p);
            const crit = p.openCriticalCount ?? 0;
            const warn = p.openWarningCount ?? 0;
            const plans = p.planCount ?? 0;
            return (
              <Link
                key={p.id}
                to={`/project/${p.id}`}
                className="dashboard-project-card group flex items-stretch overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-border2 hover:bg-white"
                style={{ borderRadius: 3 }}
              >
                <div className="shrink-0 self-stretch" style={{ width: 4, background: stripe }} aria-hidden />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-0" style={{ padding: "14px 18px" }}>
                  <div className="min-w-0 flex-1 basis-[200px]">
                    <p className="truncate font-sans text-[13px] font-semibold text-ink group-hover:text-amber">{p.name}</p>
                    <p className="mt-0.5 font-mono text-[9px] text-ink2">{projectMetaLine(p)}</p>
                    {p.architects && p.architects.length > 0 && (
                      <p className="mt-1 font-mono text-[8px] text-ink3">
                        Architekten: {p.architects.map((a) => a.name || a.email).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <span
                      className={`font-mono text-[8px] font-medium uppercase ${badge.className}`}
                      style={{ borderRadius: 2, padding: "2px 7px" }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex min-w-[80px] shrink-0 flex-col gap-1 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {crit > 0 ? (
                        <>
                          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-red" />
                          <span
                            className="font-serif text-[15px] font-semibold leading-none text-red"
                            style={{ fontFamily: "Fraunces, serif" }}
                          >
                            {crit}
                          </span>
                        </>
                      ) : (
                        <span className="font-serif text-[15px] font-semibold text-ink3" style={{ fontFamily: "Fraunces, serif" }}>
                          —
                        </span>
                      )}
                      <span className="font-mono text-[8px] uppercase text-ink3">Krit.</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      {warn > 0 ? (
                        <>
                          <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-amber" />
                          <span
                            className="font-serif text-[15px] font-semibold leading-none text-amber"
                            style={{ fontFamily: "Fraunces, serif" }}
                          >
                            {warn}
                          </span>
                        </>
                      ) : (
                        <span className="font-serif text-[15px] font-semibold text-ink3" style={{ fontFamily: "Fraunces, serif" }}>
                          —
                        </span>
                      )}
                      <span className="font-mono text-[8px] uppercase text-ink3">Warn.</span>
                    </div>
                  </div>
                  <div className="flex w-full shrink-0 flex-col items-end justify-center border-t border-border pt-3 text-right sm:w-auto sm:border-l sm:border-t-0 sm:pl-4 sm:pr-4 sm:pt-0">
                    <span className="font-serif text-[20px] font-semibold leading-none text-ink" style={{ fontFamily: "Fraunces, serif" }}>
                      {plans}
                    </span>
                    <span className="mt-0.5 font-mono text-[8px] uppercase text-ink3">{plans === 1 ? "Plan" : "Pläne"}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="px-[2px] font-mono text-[9px] leading-relaxed text-ink3">
        ℹ&nbsp;BauPilot weist auf mögliche Regelverstöße hin. Die Ergebnisse ersetzen keine offizielle Baugenehmigung und
        stellen keine Rechtsberatung dar.
      </p>
    </div>
  );
}
