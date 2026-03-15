import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, organizationsApi, authApi, PROJECT_TYPES, PROJECT_STATUSES, type ProjectSummary, type ProjectType } from "../api/client";
import { useAuthStore } from "../store/auth";
import { Button, Card, CardHeader, CardContent, Input, PageHeader } from "../components/ui";
import StatusCard from "../components/StatusCard";

const STATE_NAMES: Record<string, string> = {
  BW: "Baden-Württemberg", BY: "Bayern", BE: "Berlin", BB: "Brandenburg", HB: "Bremen",
  HH: "Hamburg", HE: "Hessen", MV: "Mecklenburg-Vorpommern", NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen", RP: "Rheinland-Pfalz", SL: "Saarland", SN: "Sachsen",
  ST: "Sachsen-Anhalt", SH: "Schleswig-Holstein", TH: "Thüringen",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Inhaber",
  manager: "Projektleiter",
  architect: "Architekt",
  reviewer: "Prüfer",
  viewer: "Betrachter",
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
              <Button
                type="submit"
                disabled={createOrgMutation.isPending || !newOrgName.trim()}
              >
                {createOrgMutation.isPending ? "Wird erstellt…" : "Büro anlegen"}
              </Button>
            </form>
            {createOrgMutation.isError && (
              <p className="mt-4 text-sm text-red-600">
                {createOrgMutation.error instanceof Error ? createOrgMutation.error.message : "Fehler"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Projekte"
        description={
          canCreateProject
            ? "Erstellen Sie ein Projekt und laden Sie Grundrisse hoch. BauPilot prüft mögliche Verstöße gegen Bauvorschriften."
            : "Ihre zugewiesenen Projekte und Prüfberichte."
        }
        breadcrumb={
          orgs.length > 0 && (
            <p className="mb-2 text-xs text-slate-500">
              {orgs.map((o, i) => (
                <span key={o.id}>
                  {i > 0 && " · "}
                  <Link to={`/org/${o.id}`} className="text-slate-500 hover:text-slate-700">
                    {o.name} ({ROLE_LABELS[o.role] ?? o.role})
                  </Link>
                </span>
              ))}
            </p>
          )
        }
      />

      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-600">Projekte einbeziehen:</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "ongoing", label: "Nur laufende" },
              { value: "ongoing,paused", label: "+ Pausierte" },
              { value: "ongoing,paused,ended", label: "+ Abgeschlossene" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProjectStatusFilter(opt.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  projectStatusFilter === opt.value
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <StatusCard
          runCount={stats?.runCount ?? 0}
          warningCount={stats?.warningCount ?? 0}
          errorCount={stats?.errorCount ?? 0}
          infoCount={stats?.infoCount}
          lastRunAt={stats?.lastRunAt}
          title="Prüfergebnisse"
        />
      </div>

      {canCreateProject && (
        <Card className="mb-8">
          <CardHeader
            title="Neues Projekt"
            description="Projekt anlegen und Grundrisse hochladen."
          />
          <CardContent>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 min-w-0">
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
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Projekttyp
                  </label>
                  <select
                    value={newProjectType}
                    onChange={(e) => setNewProjectType(e.target.value as ProjectType)}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {PROJECT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending || !newProjectName.trim() || newProjectZip.length !== 5}
                size="lg"
              >
                {createProjectMutation.isPending ? "Wird erstellt…" : "Projekt anlegen"}
              </Button>
            </form>
            {createProjectMutation.isError && (
              <p className="mt-4 text-sm text-red-600">
                {createProjectMutation.error instanceof Error ? createProjectMutation.error.message : "Fehler"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-900">Projektliste</h2>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-500">Projekte werden geladen…</p>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-600">Noch keine Projekte.</p>
            <p className="mt-1 text-sm text-slate-500">
              {canCreateProject
                ? "Legen Sie oben ein Projekt an und laden Sie einen Grundriss hoch."
                : "Sie haben noch keine zugewiesenen Projekte."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {projects.map((p: ProjectSummary) => (
            <Link
              key={p.id}
              to={`/project/${p.id}`}
              className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:border-slate-300 hover:shadow"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {p.name}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  <span className="text-slate-400">
                    {PROJECT_STATUSES.find((s) => s.value === (p.status ?? "ongoing"))?.label ?? "Laufend"}
                  </span>
                  <span className="text-slate-400"> · </span>
                  {p.planCount} {p.planCount === 1 ? "Plan" : "Pläne"}
                  {p.projectType && (
                    <span className="text-slate-400">
                      {" · "}
                      {PROJECT_TYPES.find((t) => t.value === p.projectType)?.label ?? p.projectType}
                    </span>
                  )}
                  {p.state && (
                    <span className="text-slate-400"> · {STATE_NAMES[p.state] ?? p.state}</span>
                  )}
                </p>
                {p.architects && p.architects.length > 0 && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    Architekten: {p.architects.map((a) => a.name || a.email).join(", ")}
                  </p>
                )}
              </div>
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-10 text-xs text-slate-400">
        Hinweis: Dieses Tool gibt nur mögliche Verstöße an. Es ersetzt keine behördliche Prüfung.
      </p>
    </div>
  );
}
