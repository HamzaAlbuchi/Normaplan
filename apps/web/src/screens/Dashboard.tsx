import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, type ProjectSummary } from "../api/client";

const STATE_NAMES: Record<string, string> = {
  BW: "Baden-Württemberg", BY: "Bayern", BE: "Berlin", BB: "Brandenburg", HB: "Bremen",
  HH: "Hamburg", HE: "Hessen", MV: "Mecklenburg-Vorpommern", NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen", RP: "Rheinland-Pfalz", SL: "Saarland", SN: "Sachsen",
  ST: "Sachsen-Anhalt", SH: "Schleswig-Holstein", TH: "Thüringen",
};

export default function Dashboard() {
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectZip, setNewProjectZip] = useState("");
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: ({ name, zipCode }: { name: string; zipCode: string }) =>
      projectsApi.create(name, zipCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setNewProjectName("");
      setNewProjectZip("");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const zip = newProjectZip.trim();
    if (!newProjectName.trim() || zip.length !== 5) return;
    createMutation.mutate({ name: newProjectName.trim(), zipCode: zip });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Projekte</h1>
        <p className="mt-1 text-sm text-slate-500">
          Erstellen Sie ein Projekt und laden Sie Grundrisse hoch. BauPilot prüft mögliche Verstöße gegen Bauvorschriften.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="project-name" className="sr-only">Projektname</label>
            <input
              id="project-name"
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Projektname eingeben"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="w-full sm:w-32">
            <label htmlFor="project-zip" className="block text-xs font-medium text-slate-500 mb-1">PLZ <span className="text-red-500">*</span></label>
            <input
              id="project-zip"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={newProjectZip}
              onChange={(e) => setNewProjectZip(e.target.value.replace(/\D/g, ""))}
              placeholder="80331"
              required
              aria-required="true"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending || !newProjectName.trim() || newProjectZip.length !== 5}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createMutation.isPending ? "Wird erstellt…" : "Neues Projekt"}
        </button>
      </form>

      {createMutation.isError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {createMutation.error instanceof Error ? createMutation.error.message : "Fehler"}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">Projekte werden geladen…</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">Noch keine Projekte.</p>
          <p className="mt-1 text-sm text-slate-400">Legen Sie oben ein Projekt an und laden Sie einen Grundriss hoch.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p: ProjectSummary) => (
            <li key={p.id}>
              <Link
                to={`/project/${p.id}`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex flex-1 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {p.name}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {p.planCount} {p.planCount === 1 ? "Plan" : "Pläne"}
                      {p.state && (
                        <span className="ml-1.5 text-slate-400">
                          · {STATE_NAMES[p.state] ?? p.state}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-xs text-slate-400">
        Hinweis: Dieses Tool gibt nur mögliche Verstöße an. Es ersetzt keine behördliche Prüfung.
      </p>
    </div>
  );
}
