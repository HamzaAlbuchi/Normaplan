import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, membershipsApi } from "../api/client";
import { useAuthStore } from "../store/auth";
import { Badge, Button, Card, CardHeader, CardContent, Input, PageHeader } from "../components/ui";

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

  const breadcrumb = (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Zurück zum Dashboard
    </Link>
  );

  return (
    <div>
      <PageHeader
        title={org.name}
        description={`${org.projectCount} Projekte · ${org.memberCount} Mitglieder · Ihre Rolle: ${ROLE_LABELS[membership?.role ?? ""] ?? membership?.role}`}
        breadcrumb={breadcrumb}
      />

      {isOwner && (
        <Card className="mb-8">
          <CardHeader
            title="Mitglied einladen"
            description="Nutzer muss bereits registriert sein."
          />
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <Input
                  label="E-Mail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="E-Mail"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <Button type="submit" disabled={inviteMutation.isPending || !inviteEmail.trim()}>
                {inviteMutation.isPending ? "Wird eingeladen…" : "Einladen"}
              </Button>
            </form>
            {inviteMutation.isError && (
              <p className="mt-2 text-sm text-red-600">{inviteMutation.error instanceof Error ? inviteMutation.error.message : "Fehler"}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Mitglieder</h2>
      </div>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <span className="font-medium text-slate-900">{m.name || m.email}</span>
              <span className="ml-2 text-sm text-slate-500">({m.email})</span>
            </div>
            <Badge variant="default">{ROLE_LABELS[m.role] ?? m.role}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
