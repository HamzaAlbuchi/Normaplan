import { Outlet, NavLink, useLocation, Link } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import UserMenu from "./UserMenu";
import { authApi, projectsApi } from "../api/client";

export type MainOutletContext = {
  setProjectTopbar: (node: React.ReactNode) => void;
};

function breadcrumbFromPath(pathname: string): { crumbs: { label: string; to?: string }[]; current: string } {
  if (pathname === "/") return { crumbs: [], current: "Dashboard" };
  if (pathname === "/violations") return { crumbs: [{ label: "Dashboard", to: "/" }], current: "Violations" };
  if (pathname === "/pruefumfang")
    return { crumbs: [{ label: "Dashboard", to: "/" }], current: "Prüfumfang" };
  if (pathname === "/profile") return { crumbs: [{ label: "Dashboard", to: "/" }], current: "Profil" };
  if (pathname === "/admin") return { crumbs: [{ label: "Dashboard", to: "/" }], current: "Admin" };
  if (pathname.startsWith("/org/"))
    return { crumbs: [{ label: "Dashboard", to: "/" }], current: "Organisation" };
  if (pathname.startsWith("/project/"))
    return { crumbs: [], current: "" };
  if (pathname.startsWith("/plan/"))
    return { crumbs: [{ label: "Dashboard", to: "/" }], current: "Planbericht" };
  return { crumbs: [{ label: "Dashboard", to: "/" }], current: "BauPilot" };
}

const navItem =
  "block rounded-sm py-2 pl-3 pr-2 font-sans text-xs font-medium text-[var(--nav-item-on-side)] transition-colors hover:bg-white/[0.03] hover:text-[var(--nav-item-hover-text)] border-l-2 border-transparent";

const navActive =
  " !border-amber !bg-[rgba(217,119,42,0.07)] !text-amber";

export default function Layout() {
  const { token, loadFromStorage, setUser } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [projectTopbar, setProjectTopbar] = useState<React.ReactNode>(null);

  const projectIdParam = location.pathname.match(/^\/project\/([^/]+)/)?.[1];

  const { data: crumbProject } = useQuery({
    queryKey: ["project", projectIdParam],
    queryFn: () => projectsApi.get(projectIdParam!),
    enabled: !!projectIdParam && location.pathname.startsWith("/project/"),
  });

  const { crumbs, current } = useMemo(() => {
    if (location.pathname.startsWith("/project/") && projectIdParam) {
      return {
        crumbs: [
          { label: "Dashboard", to: "/" },
          { label: "Projects", to: "/" },
        ],
        current: crumbProject?.name ?? "Projekt",
      };
    }
    return breadcrumbFromPath(location.pathname);
  }, [location.pathname, projectIdParam, crumbProject?.name]);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (token) {
      authApi.getMe().then((u) => setUser(u)).catch(() => {});
    }
  }, [token, setUser]);

  useEffect(() => {
    if (!location.pathname.startsWith("/project/")) setProjectTopbar(null);
  }, [location.pathname]);

  if (!token) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col bg-side">
        <div className="border-b border-white/10 px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center bg-amber font-sans text-lg font-extrabold text-white"
              style={{ borderRadius: 2 }}
            >
              BP
            </span>
            <div>
              <span className="font-sans text-sm font-semibold text-[var(--nav-item-hover-text)]">BauPilot</span>
              <p className="font-mono text-[8px] uppercase tracking-[2px] text-[var(--nav-section-on-side)]">
                Compliance
              </p>
            </div>
          </Link>
        </div>

        <nav className="scrollbar-app flex-1 overflow-y-auto px-2 py-4">
          <p className="mb-2 px-3 font-mono text-[8px] uppercase tracking-[2px] text-[var(--nav-section-on-side)]">
            Hauptmenü
          </p>
          <NavLink to="/" end className={({ isActive }) => navItem + (isActive ? navActive : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/violations" className={({ isActive }) => navItem + (isActive ? navActive : "")}>
            Verstöße
          </NavLink>
          <NavLink to="/pruefumfang" className={({ isActive }) => navItem + (isActive ? navActive : "")}>
            Prüfumfang
          </NavLink>
          {user?.isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => navItem + (isActive ? navActive : "")}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <UserMenu variant="sidebar" />
        </div>
      </aside>

      <div className="ml-[220px] flex min-h-screen min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-40 flex h-[54px] shrink-0 items-center justify-between border-b border-border bg-bg px-7"
        >
          <div className="flex min-w-0 items-center gap-1 font-sans text-xs text-ink2">
            {crumbs.map((c) => (
              <span key={c.label} className="flex items-center gap-1">
                <Link to={c.to ?? "/"} className="hover:text-ink">
                  {c.label}
                </Link>
                <span className="text-ink3">›</span>
              </span>
            ))}
            <span className="truncate font-semibold text-ink">{current}</span>
          </div>
          <div className="flex items-center gap-2">
            {projectTopbar ?? (
              <Link
                to="/profile"
                className="rounded-sm border border-border2 px-3 py-1.5 font-sans text-[11px] font-semibold tracking-wide text-ink hover:border-ink2"
              >
                Profil
              </Link>
            )}
          </div>
        </header>

        <main className="scrollbar-app flex-1 overflow-y-auto px-7 py-6">
          <Outlet context={{ setProjectTopbar } satisfies MainOutletContext} />
        </main>
      </div>
    </div>
  );
}
