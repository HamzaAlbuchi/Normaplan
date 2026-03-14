import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, membershipsApi, useAuthStore } from "../api/client";

const ROLE_LABELS: Record<string, string> = {
  owner: "Inhaber",
  manager: "Projektleiter",
  architect: "Architekt",
  reviewer: "Prüfer",
  viewer: "Betrachter",
};

export default function Organization() {
  const { orgId } = useParams<{ orgId: string }>();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("architect");
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const membership = user?.organizations?.find((o) => o.id === orgId);
  const isOwner = membership?.role === "owner";

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => organizationsApi.get(orgId!),
    enabled: !!orgId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", orgId],
    queryFn: () => membershipsApi.listByOrg(orgId!),
    enabled: !!orgId && !!membership,
  });

  const inviteMutation = useMutation({
    mutationFn: () => membershipsApi.invite(orgId!, inviteEmail, inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      setInviteEmail("");
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate();
  };

  if (!org) return null;

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Zurück zum Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{org.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {org.projectCount} Projekte · {org.memberCount} Mitglieder · Ihre Rolle: {ROLE_LABELS[membership?.role ?? ""] ?? membership?.role}
        </p>
      </div>

      {isOwner && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Mitglied einladen</h2>
          <p className="mt-1 text-sm text-slate-500">Nutzer muss bereits registriert sein.</p>
          <form onSubmit={handleInvite} className="mt-4 flex flex-wrap gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="E-Mail"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {inviteMutation.isPending ? "Wird eingeladen…" : "Einladen"}
            </button>
          </form>
          {inviteMutation.isError && (
            <p className="mt-2 text-sm text-red-600">{inviteMutation.error instanceof Error ? inviteMutation.error.message : "Fehler"}</p>
          )}
        </div>
      )}

      <p className="text-sm font-semibold text-slate-900 mb-3">Mitglieder</p>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div>
              <span className="font-medium text-slate-900">{m.name || m.email}</span>
              <span className="ml-2 text-sm text-slate-500">({m.email})</span>
            </div>
            <span className="text-xs font-medium text-slate-500">{ROLE_LABELS[m.role] ?? m.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
