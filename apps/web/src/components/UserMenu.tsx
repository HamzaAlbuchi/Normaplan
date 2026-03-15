import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

function getInitials(email: string, name?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.trim().slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0];
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login");
  };

  const initials = user?.email ? getInitials(user.email, user.name) : "?";
  const displayName = user?.name || user?.email?.split("@")[0] || "Benutzer";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2.5 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Benutzermenü"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700">
          {initials}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm text-slate-500 sm:block">
          {displayName}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg z-50"
          role="menu"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            role="menuitem"
          >
            Profil
          </Link>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            role="menuitem"
          >
            Einstellungen
          </Link>
          <div className="border-t border-slate-100" />
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            role="menuitem"
          >
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}
