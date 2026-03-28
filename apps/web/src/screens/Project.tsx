import { useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, plansApi, membershipsApi, PROJECT_TYPES, PROJECT_STATUSES, type PlanSummary, type ProjectStatus } from "../api/client";
import { useAuthStore } from "../store/auth";
import { Badge, Button, Card, CardHeader, CardContent, PageHeader } from "../components/ui";

const STATE_NAMES: Record<string, string> = {
  BW: "Baden-Württemberg", BY: "Bayern", BE: "Berlin", BB: "Brandenburg", HB: "Bremen",
  HH: "Hamburg", HE: "Hessen", MV: "Mecklenburg-Vorpommern", NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen", RP: "Rheinland-Pfalz", SL: "Saarland", SN: "Sachsen",
  ST: "Sachsen-Anhalt", SH: "Schleswig-Holstein", TH: "Thüringen",
};

function ProjectViolationsSummary({ projectId }: { projectId: string }) {
  const { data: stats } = useQuery({
    queryKey: ["project-violation-stats", projectId],
    queryFn: () => projectsApi.getViolationStats(projectId),
    enabled: !!projectId,
  });

  if (!stats || stats.total === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader
        title="Verstöße in diesem Projekt"
        description="Mögliche Abweichungen von Bauvorschriften – prüfen und bewerten."
      />
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-sans text-sm text-ink2">
            <strong className="font-serif text-lg text-ink">{stats.total}</strong> Verstoß{stats.total !== 1 ? "e" : ""} gesamt
          </span>
          {stats.openCount > 0 && (
            <Badge variant="default">{stats.openCount} offen</Badge>
          )}
          {stats.criticalCount > 0 && (
            <Badge variant="critical">{stats.criticalCount} kritisch</Badge>
          )}
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/violations?projectId=${projectId}`}>
              Alle Verstöße anzeigen
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectAssignments({ projectId, organizationId }: { projectId: string; organizationId: string }) {
  const queryClient = useQueryClient();
  const { data: assignments = [] } = useQuery({
    queryKey: ["project-assignments", projectId],
    queryFn: () => projectsApi.listAssignments(projectId),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["members", organizationId],
    queryFn: () => membershipsApi.listByOrg(organizationId),
    enabled: !!organizationId,
  });
  const architects = members.filter((m) => m.role === "architect");
  const addMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.addAssignment(projectId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-assignments", projectId] }),
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeAssignment(projectId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-assignments", projectId] }),
  });
  const assignedIds = new Set(assignments.map((a) => a.userId));
  const available = architects.filter((a) => !assignedIds.has(a.userId));

  return (
    <Card className="mb-8">
      <CardHeader
        title="Architekten zuweisen"
        description="Architekten können Pläne hochladen und Prüfläufe starten."
      />
      <CardContent>
        {assignments.length > 0 && (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.userId} className="flex items-center justify-between rounded-sm bg-bg2 px-3 py-2">
                <span className="font-sans text-sm text-ink">{a.name || a.email}</span>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(a.userId)}
                  disabled={removeMutation.isPending}
                  className="font-mono text-[9px] text-ink2 hover:text-red transition-colors"
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
        )}
        {available.length > 0 && (
          <div className="mt-3">
            <select
              className="h-9 w-full rounded-sm border border-border2 bg-card px-3 font-sans text-sm text-ink focus:border-ink2 focus:outline-none"
              onChange={(e) => {
                const v = e.target.value;
                if (v) { addMutation.mutate(v); e.target.value = ""; }
              }}
            >
              <option value="">Architekt hinzufügen…</option>
              {available.map((a) => (
                <option key={a.userId} value={a.userId}>{a.name || a.email}</option>
              ))}
            </select>
          </div>
        )}
        {architects.length === 0 && (
          <p className="font-sans text-sm text-ink2">Laden Sie zuerst Architekten ins Büro ein.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const canEdit = project?.organizationId && user?.organizations?.some(
    (o) => o.id === project.organizationId && !["viewer"].includes(o.role)
  );
  const canWork = project?.organizationId && user?.organizations?.some(
    (o) => o.id === project.organizationId && ["owner", "manager", "architect", "reviewer"].includes(o.role)
  );

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans", projectId],
    queryFn: () => plansApi.listByProject(projectId!),
    enabled: !!projectId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) =>
      plansApi.upload(projectId!, file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans", projectId] });
      setUploadError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => setUploadError(err instanceof Error ? err.message : "Upload fehlgeschlagen"),
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => plansApi.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
      navigate("/");
    },
  });

  const [statusSaved, setStatusSaved] = useState(false);
  const updateStatusMutation = useMutation({
    mutationFn: (status: ProjectStatus) => projectsApi.update(projectId!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 2000);
    },
  });

  const handleDeletePlan = (plan: PlanSummary, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Plan „${plan.name}" wirklich löschen?`)) return;
    deletePlanMutation.mutate(plan.id);
  };

  const handleDeleteProject = () => {
    if (!project?.name || !projectId) return;
    if (!window.confirm(`Projekt „${project.name}" und alle Pläne unwiderruflich löschen?`)) return;
    deleteProjectMutation.mutate(projectId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    uploadMutation.mutate(
      { file, name: file.name },
      { onSettled: () => setUploading(false) }
    );
  };

  const breadcrumb = (
    <Link
      to="/"
      className="mb-4 inline-flex items-center gap-1.5 font-sans text-xs font-medium text-ink2 hover:text-ink transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Zurück zu Projekten
    </Link>
  );

  return (
    <div>
      <PageHeader
        title={project?.name ?? "Projekt"}
        description={
          <>
            {project?.organizationName && (
              <span className="block font-sans text-sm text-ink2">Büro: {project.organizationName}</span>
            )}
            {project?.projectType && (
              <span className="block font-sans text-sm text-ink2">
                Projekttyp: {PROJECT_TYPES.find((t) => t.value === project.projectType)?.label ?? project.projectType}
              </span>
            )}
            {canEdit && project?.organizationId && (
              <span className="block font-sans text-sm text-ink2">
                Status:{" "}
                <select
                  value={project.status ?? "ongoing"}
                  onChange={(e) => updateStatusMutation.mutate(e.target.value as ProjectStatus)}
                  disabled={updateStatusMutation.isPending}
                  className="ml-1 rounded-sm border border-border2 bg-card px-2 py-0.5 font-sans text-sm text-ink focus:border-ink2 focus:outline-none"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {statusSaved && (
                  <span className="ml-2 font-mono text-[9px] text-green">Gespeichert</span>
                )}
              </span>
            )}
            {!canEdit && project?.status && project.status !== "ongoing" && (
              <span className="block font-sans text-sm text-ink2">
                Status: {PROJECT_STATUSES.find((s) => s.value === project.status)?.label ?? project.status}
              </span>
            )}
            {project?.zipCode && (
              <span className="block font-sans text-sm text-ink2">
                Standort: {project.zipCode}
                {project?.state && (
                  <span className="text-ink3"> · {STATE_NAMES[project.state] ?? project.state}</span>
                )}
              </span>
            )}
            <span className="block font-sans text-sm text-ink2">Grundrisse hochladen und Prüflauf starten.</span>
          </>
        }
        breadcrumb={breadcrumb}
        action={
          projectId && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" asChild>
                <Link to={`/violations?projectId=${projectId}`}>Verstöße anzeigen</Link>
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  onClick={handleDeleteProject}
                  disabled={deleteProjectMutation.isPending}
                  className="text-red hover:bg-red-soft"
                >
                  {deleteProjectMutation.isPending ? "Wird gelöscht…" : "Projekt löschen"}
                </Button>
              )}
            </div>
          )
        }
      />

      {project?.organizationId && user?.organizations?.some((o) => o.id === project.organizationId && ["owner", "manager"].includes(o.role)) && (
        <ProjectAssignments projectId={projectId!} organizationId={project.organizationId} />
      )}

      {projectId && (
        <ProjectViolationsSummary projectId={projectId} />
      )}

      {canWork && (
        <Card className="mb-8">
          <CardHeader
            title="Plan hochladen"
            description="JSON-, PDF-, IFC/BIM- oder DWG/DXF-Datei mit Plan-Elementen (Räume, Flure, Türen, Fenster, Treppen, Rettungswege). DWG/DXF erfordert GEMINI_API_KEY und CONVERTAPI_SECRET."
          />
          <CardContent>
            <label className="mx-0 mt-4 mb-4 flex cursor-pointer flex-col items-center justify-center rounded-md border-[1.5px] border-dashed border-border2 px-6 py-10 transition-colors hover:border-amber hover:bg-amber-soft">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border2 bg-card text-ink2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </span>
              <span className="font-sans text-xs font-semibold text-ink">Datei auswählen</span>
              <span className="mt-1 font-mono text-[9px] text-ink2">JSON, PDF, IFC, DWG/DXF</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.pdf,.ifc,.dwg,.dxf"
                onChange={handleFileChange}
                disabled={uploading}
                className="sr-only"
              />
            </label>
            {uploadError && <p className="mt-2 font-mono text-sm text-red">{uploadError}</p>}
            {uploading && <p className="mt-2 font-sans text-sm text-ink2">Wird hochgeladen…</p>}
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[1.2px] text-ink">Pläne in diesem Projekt</h2>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-ink2">Lade Pläne…</p>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-sans text-sm text-ink2">Noch keine Pläne.</p>
            <p className="mt-1 font-mono text-[9px] text-ink3">Laden Sie oben eine Datei hoch.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((p: PlanSummary) => (
            <div
              key={p.id}
              className="group flex items-center gap-4 rounded-md border border-border bg-card px-5 py-4 transition-colors hover:bg-white"
            >
              <Link to={`/plan/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate font-sans text-xs font-semibold text-ink group-hover:text-amber transition-colors">
                  {p.name}
                </p>
                <p className="mt-0.5 truncate font-mono text-[9px] text-ink2">
                  {p.fileName} · {p.status}
                  {p.lastRunId && <span className="text-blue"> · Bericht</span>}
                </p>
              </Link>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeletePlan(p, e)}
                  disabled={deletePlanMutation.isPending}
                  className="text-ink2 hover:text-red"
                >
                  Löschen
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/plan/${p.id}`} aria-label="Bericht öffnen">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
