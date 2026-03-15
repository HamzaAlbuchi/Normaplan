import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api/client";
import StatusCard from "../components/StatusCard";
import { Card, CardContent, PageHeader } from "../components/ui";

export default function Admin() {
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>("ongoing");
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats", projectStatusFilter],
    queryFn: () => adminApi.getStats({ projectStatus: projectStatusFilter }),
  });
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.getUsers(),
  });

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Übersicht über Nutzer, Projekte und Prüfergebnisse."
      />

      {statsLoading ? (
        <p className="text-sm text-slate-500">Statistiken werden geladen…</p>
      ) : stats ? (
        <>
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
              runCount={stats.runCount}
              warningCount={stats.warningCount}
              errorCount={stats.errorCount}
              infoCount={stats.infoCount}
              lastRunAt={stats.lastRunAt}
              title="Prüfergebnisse"
            />
          </div>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Nutzer", value: stats.userCount },
              { label: "Projekte", value: stats.projectCount },
              { label: "Prüfläufe", value: stats.runCount },
              { label: "Verstöße gesamt", value: stats.violationCount },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <h2 className="text-base font-semibold text-slate-900 mb-4">Nutzer & Projekte</h2>
      {usersLoading ? (
        <p className="text-sm text-slate-500">Nutzer werden geladen…</p>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-500">Noch keine Nutzer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{u.email}</p>
                  {u.name && (
                    <p className="text-sm text-slate-500">{u.name}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Registriert: {new Date(u.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-slate-600">
                    <strong>{u.projectCount}</strong> Projekte
                  </span>
                  <span className="text-slate-600">
                    <strong>{u.planCount}</strong> Pläne
                  </span>
                  <span className="text-slate-600">
                    <strong>{u.runCount}</strong> Prüfläufe
                  </span>
                  <span className="text-slate-600">
                    <strong>{u.violationCount}</strong> Verstöße
                  </span>
                </div>
              </div>
              {u.projects.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Projekte
                  </p>
                  <ul className="space-y-2">
                    {u.projects.map((p) => (
                      <li key={p.id} className="text-sm">
                        <span className="font-medium text-slate-700">{p.name}</span>
                        <span className="text-slate-400"> · {p.state}</span>
                        <span className="text-slate-400"> · {p.planCount} Pläne</span>
                        {p.runs.length > 0 && (
                          <ul className="ml-4 mt-1 space-y-0.5 text-slate-500">
                            {p.runs.map((r) => (
                              <li key={r.id}>
                                {r.planName}: {r.violationCount} Verstöße
                                {r.errorCount > 0 && (
                                  <span className="text-red-600"> ({r.errorCount} Fehler)</span>
                                )}
                                {r.warningCount > 0 && (
                                  <span className="text-amber-600"> ({r.warningCount} Warnungen)</span>
                                )}
                                {" · "}
                                {new Date(r.checkedAt).toLocaleString("de-DE")}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
