import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, organizationsApi, authApi, PROJECT_TYPES, PROJECT_STATUSES, type ProjectSummary, type ProjectType } from "../api/client";
import { useAuthStore } from "../store/auth";
import { Button, Card, CardHeader, CardContent, Input, PageHeader } from "../components/ui";
import StatusCard from "../components/StatusCard";

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

function projectHealthBar(p: ProjectSummary): "red" | "amber" | "green" | "blue" {
  if ((p.planCount ?? 0) > 0) return "green";
  return "blue";
}

const barColor: Record<string, string> = {
  red: "bg-red",
  amber: "bg-amber",
  green: "bg-green",
  blue: "bg-blue",
};

export default function Dashboard() {
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectZip, setNewProjectZip] = useState("");
  const [newProjectType, setNewProjectType] = useState<ProjectType>("residential");
  const [newOrgName, setNewOrgName] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("ongoing");
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const orgs = user?.organizations ?? [];
  const canCreateProject = orgs.some((o) => ["owner", "manager"].includes(o.role));
  const defaultOrgId = orgs[0]?.id;

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });
  const { data: stats } = useQuery({
    queryKey: ["projects", "stats"],
    queryFn: () => projectsApi.getStats(),
  });

  const createProjectMutation = useMutation({
    mutationFn: ({ name, zipCode, projectType }: { name: string; zipCode: string; projectType: ProjectType }) =>
      projectsApi.create(name, zipCode, projectType, defaultOrgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
      setNewProjectName("");
      setNewProjectZip("");
      setNewProjectType("residential");
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

  const filterOpts = [
    { value: "ongoing", label: "Nur laufende" },
    { value: "ongoing,paused", label: "+ Pausierte" },
    { value: "ongoing,paused,ended", label: "+ Abgeschlossene" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <PageHeader
          title="Projekte"
          description={
            canCreateProject
              ? "Erstellen Sie ein Projekt und laden Sie Grundrisse hoch. BauPilot prüft mögliche Verstöße gegen Bauvorschriften."
              : "Ihre zugewiesenen Projekte und Prüfberichte."
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

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-sans text-sm font-medium text-ink2">Projekte einbeziehen:</span>
          <div className="flex flex-wrap gap-2">
            {filterOpts.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProjectStatusFilter(opt.value)}
                className={`rounded-sm border px-2 py-0.5 font-mono text-[9px] transition-colors ${
                  projectStatusFilter === opt.value
                    ? "border-ink bg-ink text-bg"
                    : "border-border2 text-ink2 hover:border-ink2 hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {canCreateProject && (
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

        <div>
          <h2 className="font-sans text-[11px] font-bold uppercase tracking-[1.2px] text-ink">Projektliste</h2>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="font-mono text-sm text-ink2">Projekte werden geladen…</p>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="font-sans text-sm text-ink2">Noch keine Projekte.</p>
              <p className="mt-1 font-mono text-[9px] text-ink3">
                {canCreateProject
                  ? "Legen Sie oben ein Projekt an und laden Sie einen Grundriss hoch."
                  : "Sie haben noch keine zugewiesenen Projekte."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {projects.map((p: ProjectSummary) => {
              const health = projectHealthBar(p);
              const totalV = p.planCount;
              return (
                <Link
                  key={p.id}
                  to={`/project/${p.id}`}
                  className="group flex items-stretch overflow-hidden rounded-md border border-border bg-card transition-colors hover:bg-white"
                >
                  <div className={`w-[3px] shrink-0 ${barColor[health]}`} aria-hidden />
                  <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-xs font-semibold text-ink group-hover:text-amber">{p.name}</p>
                      <p className="mt-0.5 font-mono text-[9px] text-ink2">
                        {PROJECT_STATUSES.find((s) => s.value === (p.status ?? "ongoing"))?.label ?? "Laufend"}
                        {" · "}
                        {p.planCount} {p.planCount === 1 ? "Plan" : "Pläne"}
                        {p.projectType && (
                          <>
                            {" · "}
                            {PROJECT_TYPES.find((t) => t.value === p.projectType)?.label ?? p.projectType}
                          </>
                        )}
                        {p.state && <> · {STATE_NAMES[p.state] ?? p.state}</>}
                      </p>
                      {p.architects && p.architects.length > 0 && (
                        <p className="mt-0.5 font-mono text-[8px] text-ink3">
                          Architekten: {p.architects.map((a) => a.name || a.email).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`font-serif text-xl font-semibold leading-none ${
                          health === "red" ? "text-red" : health === "amber" ? "text-amber" : health === "green" ? "text-green" : "text-blue"
                        }`}
                      >
                        {totalV}
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-wide text-ink3">Pläne</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <p className="font-mono text-[8px] text-ink3">
          Hinweis: Dieses Tool gibt nur mögliche Verstöße an. Es ersetzt keine behördliche Prüfung.
        </p>
      </div>

      <div className="min-w-0 lg:sticky lg:top-[70px] lg:self-start">
        <StatusCard
          runCount={stats?.runCount ?? 0}
          warningCount={stats?.warningCount ?? 0}
          errorCount={stats?.errorCount ?? 0}
          infoCount={stats?.infoCount}
          lastRunAt={stats?.lastRunAt}
          title="Prüfergebnisse"
        />
      </div>
    </div>
  );
}
