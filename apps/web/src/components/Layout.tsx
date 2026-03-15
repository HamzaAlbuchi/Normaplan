import { Outlet, Link } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useEffect } from "react";
import UserMenu from "./UserMenu";
import { authApi } from "../api/client";

const navLink =
  "rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors";

export default function Layout() {
  const { token, loadFromStorage, setUser } = useAuthStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (token) {
      authApi.getMe().then((u) => setUser(u)).catch(() => {});
    }
  }, [token, setUser]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-slate-800 hover:text-slate-900 transition-colors"
            >
              <img src="/logo.png" alt="BauPilot" className="h-8 w-8 object-contain" />
              <span className="text-lg font-semibold tracking-tight">BauPilot</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-0.5">
              <Link to="/" className={navLink}>
                Dashboard
              </Link>
              <Link to="/violations" className={navLink}>
                Verstöße
              </Link>
              {user?.isAdmin && (
                <Link to="/admin" className={navLink}>
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
