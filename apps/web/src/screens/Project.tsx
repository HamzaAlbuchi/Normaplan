import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  projectsApi,
  plansApi,
  membershipsApi,
  runsApi,
  PROJECT_STATUSES,
  type PlanSummary,
  type ProjectStatus,
  type Violation,
} from "../api/client";
import { useAuthStore } from "../store/auth";
import { Button } from "../components/ui";
import type { MainOutletContext } from "../components/Layout";
import { Input } from "../components/ui";

const STATE_NAMES: Record<string, string> = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};

/** Landesbauordnung-style label per state (short) */
const STATE_RULE_ENGINE: Record<string, string> = {
  BW: "LBO BW",
  BY: "BayBO",
  BE: "BauO BE",
  BB: "BbgBO",
  HB: "BauO HB",
  HH: "BauO HH",
  HE: "HBO",
  MV: "LBPO M-V",
  NI: "NLBO",
  NW: "LBO NRW",
  RP: "LPBO",
  SL: "LBPSO",
  SN: "SächsBO",
  ST: "BauO ST",
  SH: "LBO SH",
  TH: "ThürBO",
};

const MEMBER_ROLE_LABEL: Record<string, string> = {
  owner: "Inhaber",
  manager: "Projektleiter",
  architect: "Architekt",
  reviewer: "Prüfer",
  viewer: "Betrachter",
};

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "heute";
  if (days === 1) return "vor 1 Tag";
  return `vor ${days} Tagen`;
}

function planFileFormat(fileName: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase() ?? "—";
  return ext.replace(/^\./, "") || "—";
}

function runConformityScore(r: { errorCount: number; warningCount: number; violationCount: number }): number {
  if (r.violationCount === 0) return 100;
  return Math.max(
    0,
    Math.min(100, Math.round(100 - r.errorCount * 18 - r.warningCount * 6))
  );
}

function conformityColor(score: number): "red" | "amber" | "green" {
  if (score < 65) return "red";
  if (score <= 80) return "amber";
  return "green";
}

function ruleConformityFromViolations(violations: Violation[]): { ruleName: string; pct: number }[] {
  const byRule = new Map<string, Violation[]>();
  for (const v of violations) {
    if (!byRule.has(v.ruleName)) byRule.set(v.ruleName, []);
    byRule.get(v.ruleName)!.push(v);
  }
  const rows: { ruleName: string; pct: number }[] = [];
  for (const [ruleName, vs] of byRule) {
    const openN = vs.filter((x) => x.status === "open").length;
    const pct = openN === 0 ? 100 : Math.max(8, Math.min(92, 100 - openN * 14));
    rows.push({ ruleName, pct });
  }
  return rows.sort((a, b) => a.pct - b.pct);
}

function pctColor(pct: number): string {
  if (pct < 50) return "text-red";
  if (pct <= 75) return "text-amber";
  return "text-green";
}

function pctBarFill(pct: number): string {
  if (pct < 50) return "bg-red";
  if (pct <= 75) return "bg-amber";
  return "bg-green";
}

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const ctx = useOutletContext<MainOutletContext | null>(null);
  const setProjectTopbar = ctx?.setProjectTopbar;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editZip, setEditZip] = useState("");
  const [statusSaved, setStatusSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: vStats } = useQuery({
    queryKey: ["project-violation-stats", projectId],
    queryFn: () => projectsApi.getViolationStats(projectId!),
    enabled: !!projectId,
  });

  const { data: projectRuns = [] } = useQuery({
    queryKey: ["project-runs", projectId],
    queryFn: () => projectsApi.listRuns(projectId!),
    enabled: !!projectId,
  });

  const latestRun = projectRuns[0];

  const { data: latestRunDetail } = useQuery({
    queryKey: ["run", latestRun?.id],
    queryFn: () => runsApi.get(latestRun!.id),
    enabled: !!latestRun?.id,
  });

  const ruleRows = useMemo(() => {
    const v = latestRunDetail?.violations;
    if (!Array.isArray(v) || v.length === 0) return [];
    return ruleConformityFromViolations(v);
  }, [latestRunDetail?.violations]);

  const canEdit = Boolean(
    project?.organizationId && user?.organizations?.some((o) => o.id === project.organizationId && !["viewer"].includes(o.role))
  );
  const canManage = Boolean(
    project?.organizationId && user?.organizations?.some((o) => o.id === project.organizationId && ["owner", "manager"].includes(o.role))
  );
  const canWork = Boolean(
    project?.organizationId &&
      user?.organizations?.some((o) => o.id === project.organizationId && ["owner", "manager", "architect", "reviewer"].includes(o.role))
  );

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["plans", projectId],
    queryFn: () => plansApi.listByProject(projectId!),
    enabled: !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", project?.organizationId],
    queryFn: () => membershipsApi.listByOrg(project!.organizationId!),
    enabled: !!project?.organizationId && canManage,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) => plansApi.upload(projectId!, file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-runs", projectId] });
      setUploadError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => setUploadError(err instanceof Error ? err.message : "Upload fehlgeschlagen"),
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => plansApi.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-runs", projectId] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
      navigate("/");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: ProjectStatus) => projectsApi.update(projectId!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 2000);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: { name: string; zipCode: string }) => projectsApi.update(projectId!, { name: data.name, zipCode: data.zipCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditOpen(false);
    },
  });

  const addAssignmentMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.addAssignment(projectId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (uid: string) => projectsApi.removeAssignment(projectId!, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const handleDeletePlan = (plan: PlanSummary, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Plan „${plan.name}" wirklich löschen?`)) return;
    deletePlanMutation.mutate(plan.id);
  };

  const handleDeleteProject = () => {
    if (!project?.name || !projectId) return;
    if (!window.confirm(`Projekt „${project.name}" und alle Pläne unwiderruflich löschen?`)) return;
    deleteProjectMutation.mutate(projectId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    uploadMutation.mutate({ file, name: file.name }, { onSettled: () => setUploading(false) });
  };

  const handleExportPdf = async () => {
    if (!latestRun || !projectId) return;
    const plan = plans.find((p) => p.id === latestRun.planId);
    if (!plan) return;
    try {
      const run = await runsApi.get(latestRun.id);
      const { exportReportAsPdf } = await import("../report/exportPdf");
      exportReportAsPdf({ plan: { name: plan.name, fileName: plan.fileName }, run, planId: plan.id });
    } catch {
      /* ignore */
    }
  };

  const openEdit = useCallback(() => {
    const p = project;
    if (p) {
      setEditName(p.name);
      setEditZip(p.zipCode ?? "");
      setEditOpen(true);
    }
  }, [project]);

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const zip = editZip.trim();
    if (!editName.trim() || zip.length !== 5) return;
    updateProjectMutation.mutate({ name: editName.trim(), zipCode: zip });
  };

  useEffect(() => {
    if (!setProjectTopbar || !projectId) return;
    if (!canEdit) {
      setProjectTopbar(null);
      return;
    }
    setProjectTopbar(
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openEdit}
          className="rounded-sm border border-border2 bg-transparent px-3 py-1.5 font-sans text-[11px] font-semibold tracking-wide text-ink hover:border-ink2"
        >
          Edit project
        </button>
        <button
          type="button"
          onClick={handleDeleteProject}
          disabled={deleteProjectMutation.isPending}
          className="rounded-sm border border-border2 bg-transparent px-3 py-1.5 font-sans text-[11px] font-semibold tracking-wide text-red hover:border-red hover:bg-red-soft disabled:opacity-50"
        >
          {deleteProjectMutation.isPending ? "Wird gelöscht…" : "Delete"}
        </button>
      </div>
    );
    return () => setProjectTopbar(null);
  }, [setProjectTopbar, projectId, canEdit, openEdit, deleteProjectMutation.isPending]);

  const firstRunnablePlan = useMemo(() => plans.find((p) => p.status === "ready") ?? plans[0], [plans]);

  const assignedArchitects = project?.architects ?? [];
  const assignedIds = new Set(assignedArchitects.map((a) => a.id));
  const availableArchitects = members.filter((m) => m.role === "architect" && !assignedIds.has(m.userId));

  const rulesEngineLabel = project?.state ? STATE_RULE_ENGINE[project.state] ?? "Landesbauordnung" : "—";

  const metaPills = project ? (
    <>
      <span className="px-3 font-mono text-[10px] text-ink2 first:pl-0">{project.organizationName ?? "—"}</span>
      <span className="px-3 font-mono text-[10px] text-ink2">
        {project.zipCode ?? "—"}
        {project.state ? ` · ${STATE_NAMES[project.state] ?? project.state}` : ""}
      </span>
      <span className="px-3 font-mono text-[10px] text-ink2">{rulesEngineLabel}</span>
      <span className="px-3 font-mono text-[10px] text-ink2 last:pr-0">
        {canEdit ? (
          <>
            <select
              value={project.status ?? "ongoing"}
              onChange={(e) => updateStatusMutation.mutate(e.target.value as ProjectStatus)}
              disabled={updateStatusMutation.isPending}
              className="cursor-pointer appearance-none border-0 bg-transparent p-0 font-mono text-[10px] text-ink2 focus:outline-none"
              aria-label="Projektstatus"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {statusSaved && <span className="ml-1 text-green">✓</span>}
          </>
        ) : (
          PROJECT_STATUSES.find((s) => s.value === project.status)?.label ?? project.status
        )}
      </span>
    </>
  ) : null;

  const openCount = vStats?.openCount ?? 0;
  const criticalOpen = vStats?.criticalCount ?? 0;
  const resolvedCount = vStats?.resolvedCount ?? 0;

  if (!projectId) return null;

  return (
    <div className="max-w-[1100px]">
      {editOpen && project && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 px-4" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-md border border-border bg-card p-6 shadow-none">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wide text-ink">Projekt bearbeiten</h2>
            <form onSubmit={submitEdit} className="mt-4 space-y-4">
              <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              <Input label="PLZ" value={editZip} onChange={(e) => setEditZip(e.target.value)} maxLength={5} required />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={updateProjectMutation.isPending}>
                  Speichern
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="animate-proj-header">
        <Link
          to="/"
          className="mb-2 inline-flex items-center gap-1.5 font-mono text-[9px] text-ink3 transition-colors hover:text-ink2"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to projects
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1
              className="font-serif text-[28px] font-semibold leading-tight tracking-[-0.5px] text-ink"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {project?.name ?? "…"}
            </h1>
            {metaPills && (
              <div className="mt-3 flex flex-wrap items-center divide-x divide-border2">{metaPills}</div>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              to={`/violations?projectId=${projectId}`}
              className="inline-flex h-9 items-center justify-center rounded-sm border border-border2 bg-transparent px-4 font-sans text-[11px] font-semibold tracking-wide text-ink hover:border-ink2"
            >
              Report violations
            </Link>
            {firstRunnablePlan && (
              <Button variant="primary" size="md" asChild>
                <Link to={`/plan/${firstRunnablePlan.id}`}>+ Start new run</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <section
        className="animate-violation-hero relative mt-8 overflow-hidden rounded-md px-[26px] py-[22px]"
        style={{ background: "var(--side)" }}
      >
        <div className="absolute bottom-5 left-[calc(100%-280px)] top-5 hidden w-px bg-on-dark-surface lg:block" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12">
          <div>
            <p className="font-mono text-[9px] font-normal uppercase tracking-[2px] text-on-dark-muted">
              Current compliance status
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span
                className="font-serif text-[52px] font-semibold leading-none tracking-[-2px] text-on-dark-primary"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {openCount}
              </span>
              <span className="mb-2 font-mono text-[11px] font-normal uppercase text-on-dark-secondary">
                violations detected
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className="rounded-sm px-[9px] py-0.5 font-mono text-[9px] font-medium uppercase"
                style={{ background: "rgba(184,50,50,0.18)", color: "#F0A0A0" }}
              >
                Critical {criticalOpen}
              </span>
              <span
                className="rounded-sm px-[9px] py-0.5 font-mono text-[9px] font-medium uppercase text-on-dark-secondary"
                style={{ background: "var(--on-dark-surface)" }}
              >
                Open {openCount}
              </span>
              <span
                className="rounded-sm px-[9px] py-0.5 font-mono text-[9px] font-medium uppercase"
                style={{ background: "rgba(42,110,71,0.18)", color: "#7EC89A" }}
              >
                Resolved {resolvedCount}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 border-0 lg:border-l lg:border-on-dark-border lg:pl-10">
            <Button variant="primary" size="md" className="w-full min-w-[200px] justify-center sm:w-auto" asChild>
              <Link to={`/violations?projectId=${projectId}`}>Show all violations →</Link>
            </Button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={!latestRun || !plans.some((p) => p.id === latestRun.planId)}
              className="inline-flex h-9 w-full min-w-[200px] items-center justify-center rounded-sm border border-on-dark-ghost-border bg-transparent font-sans text-[11px] font-semibold text-on-dark-ghost transition-colors hover:border-on-dark-ghost-border-hover hover:text-on-dark-ghost-hover disabled:opacity-40 sm:w-auto"
            >
              Export PDF report
            </button>
          </div>
        </div>
      </section>

      <div className="animate-two-col mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="border-b border-border px-[18px] py-4">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink">Floor Plans</h2>
              <p className="mt-1 font-mono text-[9px] text-ink3">
                {plans.length} {plans.length === 1 ? "plan" : "plans"} uploaded · click a plan to view its report
              </p>
            </div>
            {plansLoading ? (
              <p className="px-[18px] py-8 font-mono text-[9px] text-ink3">Loading…</p>
            ) : (
              <ul>
                {plans.map((p) => {
                  const fmt = planFileFormat(p.fileName);
                  const ready = p.status === "ready";
                  return (
                    <li key={p.id} className="border-b border-border last:border-b-0">
                      <div className="flex items-center gap-3 px-[18px] py-[13px] transition-colors hover:bg-bg">
                        <div
                          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center border border-border2 bg-bg2"
                          style={{ borderRadius: 2 }}
                        >
                          <svg className="h-4 w-4 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/plan/${p.id}`}
                            className="block truncate font-sans text-xs font-semibold text-ink transition-colors hover:text-amber"
                          >
                            {p.name}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-ink3">
                            <span
                              className={`rounded-sm px-1.5 py-px font-mono text-[8px] font-medium uppercase ${
                                ready ? "bg-green-soft text-green" : "bg-amber-soft text-[#9A5010]"
                              }`}
                              style={{ borderRadius: 2 }}
                            >
                              {ready ? "Ready" : "Processing"}
                            </span>
                            <span className="text-ink3">·</span>
                            <span>
                              {fmt} · uploaded {daysAgo(p.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <Link
                            to={`/plan/${p.id}`}
                            className="flex h-[30px] w-[30px] items-center justify-center border border-border2 bg-card transition-colors hover:bg-bg2"
                            style={{ borderRadius: 2 }}
                            aria-label="View report"
                          >
                            <svg className="h-3.5 w-3.5 text-ink2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </Link>
                          <Link
                            to={`/plan/${p.id}`}
                            className="flex h-[30px] w-[30px] items-center justify-center border border-border2 bg-card transition-colors hover:bg-bg2"
                            style={{ borderRadius: 2 }}
                            aria-label="Start run"
                          >
                            <svg className="h-3.5 w-3.5 text-ink2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </Link>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => handleDeletePlan(p, e)}
                              disabled={deletePlanMutation.isPending}
                              className="flex h-[30px] w-[30px] items-center justify-center border border-border2 bg-card text-ink2 transition-colors hover:border-red hover:bg-red-soft hover:text-red disabled:opacity-50"
                              style={{ borderRadius: 2 }}
                              aria-label="Delete plan"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.997-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {canWork && (
              <div className="m-4">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-[1.5px] border-dashed border-border2 bg-bg px-5 py-7 transition-colors hover:border-amber hover:bg-amber-soft">
                  <span
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg2 text-ink2"
                    style={{ borderRadius: 9999 }}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </span>
                  <span className="font-sans text-xs font-semibold text-ink">Upload floor plan</span>
                  <span className="mt-1 text-center font-mono text-[9px] text-ink3">
                    JSON, PDF, IFC, DWG/DXF
                    <span className="block">DWG/DXF requires GEMINI_API_KEY and CONVERTAPI_SECRET</span>
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.pdf,.ifc,.dwg,.dxf"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="sr-only"
                  />
                </label>
                {uploadError && <p className="mt-2 font-mono text-sm text-red">{uploadError}</p>}
                {uploading && <p className="mt-2 font-mono text-[9px] text-ink2">Uploading…</p>}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-start justify-between border-b border-border px-[18px] py-4">
              <div>
                <h2 className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink">Run History</h2>
                <p className="mt-1 font-mono text-[9px] text-ink3">Previous compliance checks</p>
              </div>
              <Link to={`/violations?projectId=${projectId}`} className="shrink-0 font-mono text-[10px] text-amber hover:underline">
                All runs →
              </Link>
            </div>
            {projectRuns.length === 0 ? (
              <p className="px-[18px] py-8 font-mono text-[9px] text-ink3">No runs yet.</p>
            ) : (
              <ul>
                {projectRuns.map((r, idx) => {
                  const score = runConformityScore(r);
                  const sc = conformityColor(score);
                  const colorCls = sc === "red" ? "text-red" : sc === "amber" ? "text-amber" : "text-green";
                  const n = String(projectRuns.length - idx).padStart(2, "0");
                  return (
                    <li key={r.id}>
                      <Link
                        to={`/plan/${r.planId}`}
                        className="flex items-center gap-3 px-[18px] py-3 transition-colors hover:bg-bg"
                      >
                        <span className="w-7 shrink-0 font-mono text-[9px] text-ink3">#{n}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-sans text-[11px] font-semibold text-ink">{r.fileName}</p>
                          <p className="font-mono text-[9px] text-ink3">
                            {new Date(r.checkedAt).toLocaleString("de-DE")} · compliance check
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-serif text-lg font-semibold leading-none ${colorCls}`} style={{ fontFamily: "Fraunces, serif" }}>
                            {score}%
                          </p>
                          <p className="mt-1 font-mono text-[8px] font-medium uppercase text-ink3">Conformity</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="border-b border-border px-[18px] py-4">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink">Assigned Architects</h2>
              <p className="mt-1 font-mono text-[9px] text-ink3">Can upload plans and start runs</p>
            </div>
            <ul>
              {assignedArchitects.length === 0 ? (
                <li className="px-[18px] py-6 font-mono text-[9px] text-ink3">No architects assigned.</li>
              ) : (
                assignedArchitects.map((a) => {
                  const m = members.find((mem) => mem.userId === a.id);
                  const roleKey = m?.role ?? "architect";
                  const initials = (a.name || a.email)
                    .split(/\s+/)
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "?";
                  return (
                    <li key={a.id} className="flex items-center gap-3 border-b border-border px-[18px] py-[13px] last:border-b-0">
                      <div
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center font-mono text-[10px] font-bold text-white"
                        style={{
                          borderRadius: 3,
                          background: "linear-gradient(135deg, var(--amber), var(--blue))",
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-sans text-xs font-semibold text-ink">{a.name || a.email}</p>
                        <p className="font-mono text-[9px] font-medium uppercase text-ink3">
                          {MEMBER_ROLE_LABEL[roleKey] ?? roleKey}
                        </p>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => removeAssignmentMutation.mutate(a.id)}
                          className="shrink-0 font-mono text-[8px] text-ink3 hover:text-red"
                          disabled={removeAssignmentMutation.isPending}
                        >
                          remove
                        </button>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
            {canManage && project?.organizationId && (
              <div className="border-t border-border bg-bg px-[18px] py-3.5">
                <select
                  className="h-[34px] w-full rounded-sm border border-border2 bg-card font-sans text-[11px] font-medium text-ink focus:border-ink2 focus:outline-none"
                  style={{ borderRadius: 2 }}
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) {
                      addAssignmentMutation.mutate(v);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">+ Add architect…</option>
                  {availableArchitects.map((m) => (
                    <option key={m.id} value={m.userId}>
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
                {members.length === 0 && <p className="mt-2 font-mono text-[9px] text-ink3">Loading members…</p>}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-border bg-card">
            <div className="border-b border-border px-[18px] py-4">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink">Rule Conformity</h2>
              <p className="mt-1 font-mono text-[9px] text-ink3">
                Latest run · {latestRun?.fileName ?? "—"}
              </p>
            </div>
            {!latestRunDetail ? (
              <p className="px-[18px] py-6 font-mono text-[9px] text-ink3">Run a check to see rule breakdown.</p>
            ) : ruleRows.length === 0 ? (
              <p className="px-[18px] py-6 font-mono text-[9px] text-ink3">No violations in latest run.</p>
            ) : (
              <ul>
                {ruleRows.map((row, i) => (
                  <li
                    key={row.ruleName}
                    className={`border-b border-border px-[18px] py-[11px] last:border-b-0 ${i === ruleRows.length - 1 ? "last:border-b-0" : ""}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-sans text-[11px] font-semibold text-ink">{row.ruleName}</span>
                      <span className={`font-mono text-[10px] font-medium ${pctColor(row.pct)}`}>{row.pct}%</span>
                    </div>
                    <div className="mt-2 h-0.5 w-full bg-border2" style={{ borderRadius: 1 }}>
                      <div className={`h-full ${pctBarFill(row.pct)}`} style={{ width: `${row.pct}%`, borderRadius: 1 }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
