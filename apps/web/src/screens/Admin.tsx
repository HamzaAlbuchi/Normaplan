import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../api/client";
import StatusCard from "../components/StatusCard";

export default function Admin() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.getStats(),
  });
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.getUsers(),
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Übersicht über Nutzer, Projekte und Prüfergebnisse.
        </p>
      </div>

      {statsLoading ? (
        <p className="text-sm text-slate-500">Statistiken werden geladen…</p>
      ) : stats ? (
        <>
          <div className="mb-6">
            <StatusCard
              runCount={stats.runCount}
              warningCount={stats.warningCount}
              errorCount={stats.errorCount}
              title="Gesamtstatus"
            />
          </div>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Nutzer</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.userCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Projekte</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.projectCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Prüfläufe</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.runCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Verstöße gesamt</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.violationCount}</p>
            </div>
          </div>
        </>
      ) : null}

      <h2 className="text-lg font-semibold text-slate-900 mb-4">Nutzer & Projekte</h2>
      {usersLoading ? (
        <p className="text-sm text-slate-500">Nutzer werden geladen…</p>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">Noch keine Nutzer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
