import { Outlet, Link } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useEffect } from "react";
import UserMenu from "./UserMenu";

export default function Layout() {
  const { token, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-slate-800 hover:text-slate-900 transition-colors"
            >
              <img src="/logo.png" alt="BauPilot" className="h-8 w-8 object-contain" />
              <span className="text-lg font-semibold tracking-tight">BauPilot</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                to="/"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Projekte
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
