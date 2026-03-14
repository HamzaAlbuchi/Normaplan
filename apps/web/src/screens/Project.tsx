import { useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, plansApi, type PlanSummary } from "../api/client";

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

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

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Zurück zu Projekten
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{project?.name ?? "Projekt"}</h1>
        <p className="mt-1 text-sm text-slate-500">Grundrisse hochladen und Prüflauf starten.</p>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Plan hochladen</h2>
        <p className="mt-1 text-sm text-slate-500">
          JSON- oder PDF-Datei mit Plan-Elementen (Räume, Flure, Türen, Fenster, Treppen, Rettungswege).
        </p>
        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
          {uploading && <p className="mt-2 text-sm text-slate-500">Wird hochgeladen…</p>}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-slate-900 mb-3">Pläne in diesem Projekt</h2>

      {isLoading ? (
        <p className="text-sm text-slate-500">Lade Pläne…</p>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Noch keine Pläne.</p>
          <p className="mt-1 text-sm text-slate-400">Laden Sie oben eine Datei hoch.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {plans.map((p: PlanSummary) => (
            <li key={p.id} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
              <Link to={`/plan/${p.id}`} className="min-w-0 flex-1">
                <span className="block font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {p.name}
                </span>
                <span className="block text-sm text-slate-500 truncate">
                  {p.fileName} · {p.status}
                  {p.lastRunId && <span className="text-blue-600"> · Bericht</span>}
                </span>
              </Link>
              <button
                type="button"
                onClick={(e) => handleDeletePlan(p, e)}
                disabled={deletePlanMutation.isPending}
                className="flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Plan löschen"
              >
                Löschen
              </button>
              <Link
                to={`/plan/${p.id}`}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                aria-label="Bericht öffnen"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
