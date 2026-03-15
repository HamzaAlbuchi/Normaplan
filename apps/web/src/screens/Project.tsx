import { useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, plansApi, membershipsApi, type PlanSummary } from "../api/client";
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
          <span className="text-sm text-slate-600">
            <strong>{stats.total}</strong> Verstoß{stats.total !== 1 ? "e" : ""} gesamt
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
              <li key={a.userId} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">{a.name || a.email}</span>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(a.userId)}
                  disabled={removeMutation.isPending}
                  className="text-xs text-slate-500 hover:text-red-600 transition-colors"
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
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <p className="text-sm text-slate-500">Laden Sie zuerst Architekten ins Büro ein.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
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

  const handleDeletePlan = (plan: PlanSummary, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Plan „${plan.name}" wirklich löschen?`)) return;
    deletePlanMutation.mutate(plan.id);
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
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4 transition-colors"
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
              <span className="block text-slate-500">Büro: {project.organizationName}</span>
            )}
            {project?.zipCode && (
              <span className="block text-slate-500">
                Standort: {project.zipCode}
                {project?.state && (
                  <span className="text-slate-400"> · {STATE_NAMES[project.state] ?? project.state}</span>
                )}
              </span>
            )}
            <span className="block text-slate-500">Grundrisse hochladen und Prüflauf starten.</span>
          </>
        }
        breadcrumb={breadcrumb}
        action={
          projectId && (
            <Button variant="secondary" asChild>
              <Link to={`/violations?projectId=${projectId}`}>Verstöße anzeigen</Link>
            </Button>
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
            description="JSON-, PDF- oder IFC/BIM-Datei mit Plan-Elementen (Räume, Flure, Türen, Fenster, Treppen, Rettungswege)."
          />
          <CardContent>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.pdf,.ifc"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
              {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
              {uploading && <p className="mt-2 text-sm text-slate-500">Wird hochgeladen…</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Pläne in diesem Projekt</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Lade Pläne…</p>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-600">Noch keine Pläne.</p>
            <p className="mt-1 text-sm text-slate-500">Laden Sie oben eine Datei hoch.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((p: PlanSummary) => (
            <div
              key={p.id}
              className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:border-slate-300"
            >
              <Link to={`/plan/${p.id}`} className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {p.name}
                </p>
                <p className="mt-0.5 text-sm text-slate-500 truncate">
                  {p.fileName} · {p.status}
                  {p.lastRunId && <span className="text-blue-600"> · Bericht</span>}
                </p>
              </Link>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeletePlan(p, e)}
                  disabled={deletePlanMutation.isPending}
                  className="text-slate-500 hover:text-red-600"
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
