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

export default function UserMenu({ variant = "header" }: { variant?: "header" | "sidebar" }) {
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
  const roleLabel =
    user?.isAdmin ? "Admin" : user?.organizations?.[0]?.role === "owner" ? "Inhaber" : "Mitglied";

  if (variant === "sidebar") {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-sm py-1 text-left transition-colors hover:bg-white/[0.04]"
          aria-expanded={open}
          aria-label="Benutzermenü"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-blue font-mono text-[10px] font-medium text-white"
            style={{ borderRadius: 3 }}
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-[11px] font-semibold text-[var(--nav-item-hover-text)]">
              {displayName}
            </p>
            <p className="font-mono text-[8px] uppercase tracking-wide text-[var(--nav-section-on-side)]">
              {roleLabel}
            </p>
          </div>
          <svg
            className={`h-4 w-4 shrink-0 text-[var(--nav-item-on-side)] transition-transform ${open ? "rotate-180" : ""}`}
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
            className="absolute bottom-full left-0 right-0 mb-1 rounded-sm border border-border2 bg-card py-1 z-50"
            role="menu"
          >
            <div className="border-b border-border px-3 py-2">
              <p className="truncate font-sans text-sm font-medium text-ink">{displayName}</p>
              <p className="truncate font-mono text-[9px] text-ink2">{user?.email}</p>
            </div>
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 font-sans text-sm text-ink hover:bg-bg2"
              role="menuitem"
            >
              Profil
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full px-3 py-2 text-left font-sans text-sm text-ink hover:bg-bg2"
              role="menuitem"
            >
              Abmelden
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-sm py-1.5 pl-1.5 pr-2.5 text-left transition-colors hover:bg-bg2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Benutzermenü"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-blue font-mono text-sm font-medium text-white">
          {initials}
        </span>
        <span className="hidden max-w-[140px] truncate font-sans text-sm text-ink2 sm:block">{displayName}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-ink3 transition-transform ${open ? "rotate-180" : ""}`}
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
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-sm border border-border2 bg-card py-1"
          role="menu"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate font-sans text-sm font-medium text-ink">{displayName}</p>
            <p className="truncate font-mono text-xs text-ink2">{user?.email}</p>
          </div>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 font-sans text-sm text-ink hover:bg-bg2"
            role="menuitem"
          >
            Profil
          </Link>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 font-sans text-sm text-ink hover:bg-bg2"
            role="menuitem"
          >
            Einstellungen
          </Link>
          <div className="border-t border-border" />
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full px-4 py-2.5 text-left font-sans text-sm text-ink hover:bg-bg2"
            role="menuitem"
          >
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}
