import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useEffect } from "react";

export default function Layout() {
  const { token, user, logout, loadFromStorage } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary-600 hover:opacity-90">
          <img src="/logo.png" alt="BauPilot" className="h-12 object-contain" />
          <span className="text-xl font-semibold">BauPilot</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/profile" className="text-sm text-slate-600 hover:text-primary-600">
            Profil
          </Link>
          <span className="text-sm text-slate-500">{user?.email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Abmelden
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
