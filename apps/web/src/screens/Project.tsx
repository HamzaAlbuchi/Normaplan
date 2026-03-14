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
    deletePlanMutation.mutate(plan.id, {
      onSuccess: () => {},
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    uploadMutation.mutate(
      { file, name: file.name },
      {
        onSettled: () => setUploading(false),
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/" className="text-sm text-primary-600 hover:underline mb-4 inline-block">
        ← Zurück zu Projekten
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800 mb-1">{project?.name ?? "Projekt"}</h1>
      <p className="text-slate-600 mb-6">Grundrisse hochladen und Prüflauf starten.</p>

      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
        <h2 className="font-medium text-slate-800 mb-2">Plan hochladen</h2>
        <p className="text-sm text-slate-500 mb-4">
          Laden Sie eine <strong>JSON-</strong> oder <strong>PDF-</strong>Datei mit Plan-Elementen hoch (Raum, Flur, Türen, Fenster, Treppen, Rettungsweg).
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700"
        />
        {uploadError && (
          <p className="mt-2 text-sm text-red-600">{uploadError}</p>
        )}
        {uploading && <p className="mt-2 text-sm text-slate-500">Wird hochgeladen…</p>}
      </div>

      <h2 className="font-medium text-slate-800 mb-3">Pläne in diesem Projekt</h2>
      {isLoading ? (
        <p className="text-slate-500">Lade Pläne…</p>
      ) : plans.length === 0 ? (
        <p className="text-slate-500">Noch keine Pläne. Laden Sie oben eine JSON-Plan-Datei hoch.</p>
      ) : (
        <ul className="space-y-3">
          {plans.map((p: PlanSummary) => (
            <li key={p.id} className="flex items-stretch gap-2">
              <Link
                to={`/plan/${p.id}`}
                className="flex-1 block rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-300 hover:bg-primary-50/30 transition"
              >
                <span className="font-medium text-slate-800">{p.name}</span>
                <span className="ml-2 text-slate-500 text-sm">
                  {p.fileName} · Status: {p.status}
                </span>
                {p.lastRunId && (
                  <span className="ml-2 text-primary-600 text-sm">· Bericht anzeigen</span>
                )}
              </Link>
              <button
                type="button"
                onClick={(e) => handleDeletePlan(p, e)}
                disabled={deletePlanMutation.isPending}
                className="px-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                title="Plan löschen"
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
