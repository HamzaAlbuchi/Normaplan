import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, type ProjectSummary } from "../api/client";

export default function Dashboard() {
  const [newProjectName, setNewProjectName] = useState("");
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => projectsApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewProjectName("");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createMutation.mutate(newProjectName.trim());
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo.png" alt="BauPilot" className="h-16 object-contain" />
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Projekte</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Erstellen Sie ein Projekt und laden Sie Grundrisse hoch. BauPilot prüft mögliche Verstöße gegen Bauvorschriften.
          </p>
        </div>
      </div>
      <form onSubmit={handleCreate} className="flex gap-3 mb-8">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="Projektname"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !newProjectName.trim()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          Projekt anlegen
        </button>
      </form>

      {createMutation.isError && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm p-3">
          {createMutation.error instanceof Error ? createMutation.error.message : "Fehler"}
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-500">Lade Projekte…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Noch keine Projekte. Legen Sie oben ein Projekt an und laden Sie einen Grundriss hoch.
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((p: ProjectSummary) => (
            <li key={p.id}>
              <Link
                to={`/project/${p.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-300 hover:bg-primary-50/30 transition"
              >
                <span className="font-medium text-slate-800">{p.name}</span>
                <span className="ml-2 text-slate-500 text-sm">
                  {p.planCount} {p.planCount === 1 ? "Plan" : "Pläne"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-slate-400">
        Hinweis: Dieses Tool gibt nur mögliche Verstöße an. Es ersetzt keine behördliche Prüfung.
      </p>
    </div>
  );
}
