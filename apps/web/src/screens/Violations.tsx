import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  violationsApi,
  projectsApi,
  plansApi,
  runsApi,
  type ViolationListItem,
  type ViolationsListParams,
} from "../api/client";
import { useAuthStore } from "../store/auth";
import ViolationActionModal from "../components/ViolationActionModal";
import HistoryModal from "../components/HistoryModal";
import type { MainOutletContext } from "../components/Layout";
import { fmt } from "../utils/measureFormat";
import {
  RULE_TYPE_OPTIONS,
  violationRuleCategory,
  shortCategoryLabel,
  type RuleCategoryKey,
} from "../violations/ruleCategory";

type ChipKey = "all" | "critical" | "warning" | "postponed" | "resolved" | "my";

function shortRegRef(ref: string | undefined): string {
  if (!ref?.trim()) return "—";
  const t = ref.trim();
  return t.length <= 28 ? t : `${t.slice(0, 26)}…`;
}

function passesChips(v: ViolationListItem, chips: Set<ChipKey>, userId?: string): boolean {
  if (chips.size === 0 || chips.has("all")) return true;
  const parts: boolean[] = [];
  if (chips.has("critical")) parts.push(v.severity === "error" || v.severity === "critical");
  if (chips.has("warning")) parts.push(v.severity === "warning");
  if (chips.has("postponed")) parts.push(v.status === "deferred");
  if (chips.has("resolved")) parts.push(v.status === "resolved");
  if (chips.has("my") && userId) parts.push(v.reviewedBy?.id === userId);
  if (parts.length === 0) return true;
  return parts.some(Boolean);
}

function statusBadgeClasses(status: string): string {
  switch (status) {
    case "open":
      return "bg-red-soft text-red";
    case "confirmed":
      return "bg-amber-soft text-[#9A5010]";
    case "deferred":
      return "bg-blue-soft text-blue";
    case "resolved":
      return "bg-green-soft text-green";
    case "dismissed":
      return "bg-bg2 text-ink2";
    default:
      return "bg-bg2 text-ink2";
  }
}

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    open: "Open",
    confirmed: "Confirmed",
    deferred: "Postponed",
    resolved: "Resolved",
    dismissed: "Dismissed",
  };
  return m[status] ?? status;
}

function Chip({
  active,
  onClick,
  children,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant: "default" | "critical" | "warning";
}) {
  const activeCls =
    variant === "critical"
      ? "bg-red border-red text-white"
      : variant === "warning"
        ? "bg-amber border-amber text-white"
        : "bg-ink border-ink text-bg";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-2.5 py-1 font-mono text-[9px] tracking-[0.5px] transition-colors ${
        active
          ? activeCls
          : "border-border2 bg-transparent text-ink2 hover:border-ink2 hover:text-ink"
      }`}
      style={{ borderRadius: 2 }}
    >
      {children}
    </button>
  );
}

const selectViolationsClass =
  "cursor-pointer appearance-none rounded-sm border border-border2 bg-transparent py-1 pl-2 pr-6 font-mono text-[9px] text-ink2 outline-none focus:border-amber hover:border-ink2";

function ViolationRow({
  v,
  expanded,
  onToggle,
  rowAnimIndex,
  onConfirm,
  onDefer,
  onDismiss,
  onHistory,
  canReview,
}: {
  v: ViolationListItem;
  expanded: boolean;
  onToggle: () => void;
  rowAnimIndex: number;
  onConfirm: () => void;
  onDefer: () => void;
  onDismiss: () => void;
  onHistory: () => void;
  canReview: boolean;
}) {
  const dotClass =
    v.severity === "critical" || v.severity === "error"
      ? "bg-red shadow-[0_0_0_3px_rgba(184,50,50,0.12)]"
      : v.severity === "warning"
        ? "bg-amber shadow-[0_0_0_3px_rgba(217,119,42,0.12)]"
        : "bg-blue shadow-[0_0_0_3px_rgba(30,78,128,0.12)]";
  const isAi = v.ruleId?.startsWith("ai-gemini-");
  const catUpper = shortCategoryLabel(v).toUpperCase();
  const delay = `${Math.min(rowAnimIndex, 12) * 20}ms`;

  const openActions = v.status === "open" && canReview;

  return (
    <li
      className={`violation-row-animate border-b border-border ${expanded ? "bg-card" : ""}`}
      style={{ animationDelay: delay }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="relative grid w-full cursor-pointer grid-cols-[14px_1fr_auto] items-start gap-3 px-6 py-[13px] text-left transition-colors hover:bg-card"
      >
        {expanded && <span className="absolute bottom-0 right-0 top-0 w-[3px] bg-amber" aria-hidden />}
        <span className={`mt-1 h-[7px] w-[7px] shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <div className="min-w-0">
          <div className="mb-0.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[1px] text-ink3">{catUpper}</span>
            {isAi && (
              <span
                className="rounded-sm bg-blue-soft px-1.5 py-px font-mono text-[7px] font-medium uppercase tracking-[0.8px] text-blue"
                style={{ borderRadius: 2 }}
              >
                AI
              </span>
            )}
          </div>
          <p className="mb-1.5 line-clamp-2 font-sans text-xs font-semibold leading-[1.3] text-ink">{v.description}</p>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1">
            {v.actualValue != null && (
              <span className="font-mono text-[10px] font-medium">
                <span className="text-ink3">Measured </span>
                <span className="text-red">{fmt(v.actualValue, "m")}</span>
              </span>
            )}
            {v.requiredValue != null && (
              <span className="font-mono text-[10px] font-medium">
                <span className="text-ink3">Required </span>
                <span className="text-green">{fmt(v.requiredValue, "m")}</span>
              </span>
            )}
            {v.elementIds?.length ? (
              <span className="font-mono text-[10px] font-medium text-ink2">
                <span className="text-ink3">Elements </span>
                {v.elementIds.join(", ")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-[9px] text-ink3">
            {v.projectName} · {v.planName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span
            className={`font-mono text-[8px] font-medium uppercase ${statusBadgeClasses(v.status)}`}
            style={{ borderRadius: 2, padding: "2px 7px" }}
          >
            {statusLabel(v.status)}
          </span>
          <span className="max-w-[140px] font-mono text-[8px] text-ink3">{shortRegRef(v.regulationRef)}</span>
        </div>
      </div>
      {expanded && (
        <div className="block px-6 pb-3.5 pl-[50px] pr-6">
          <div
            className="mb-2.5 border-l-2 border-border2 pl-3.5 font-mono text-[10px] leading-[1.7] text-ink2"
            style={{ padding: "10px 14px", background: "var(--bg)", borderRadius: 2 }}
          >
            {v.description}
          </div>
          {openActions && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded-sm border border-border2 bg-transparent px-3 py-1.5 font-sans text-[10px] font-semibold text-ink2 transition-colors hover:border-amber hover:bg-amber-soft hover:text-[#9A5010]"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
              >
                Confirm violation
              </button>
              <button
                type="button"
                className="rounded-sm border border-border2 bg-transparent px-3 py-1.5 font-sans text-[10px] font-semibold text-ink2 transition-colors hover:border-blue hover:bg-blue-soft hover:text-blue"
                onClick={(e) => {
                  e.stopPropagation();
                  onDefer();
                }}
              >
                Defer
              </button>
              <button
                type="button"
                className="rounded-sm border border-border2 bg-transparent px-3 py-1.5 font-sans text-[10px] font-semibold text-ink2 transition-colors hover:border-green hover:bg-green-soft hover:text-green"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          <p className="mt-2 font-mono text-[8px] text-ink3">
            Source: {shortRegRef(v.regulationRef)} · {isAi ? "Detected by AI analysis" : "Detected by rule engine"}
          </p>
          <button
            type="button"
            className="mt-1 font-mono text-[8px] text-amber hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onHistory();
            }}
          >
            Review history
          </button>
        </div>
      )}
    </li>
  );
}

function StickySectionHeaderFixed({
  label,
  count,
  colorVar,
}: {
  label: string;
  count: number;
  colorVar: "red" | "amber" | "blue";
}) {
  const textColor = colorVar === "red" ? "text-red" : colorVar === "amber" ? "text-amber" : "text-blue";
  const dotBg = colorVar === "red" ? "bg-red" : colorVar === "amber" ? "bg-amber" : "bg-blue";
  return (
    <div
      className="sticky top-0 z-[2] flex items-center gap-2.5 border-b border-border bg-bg"
      style={{ padding: "10px 24px 6px" }}
    >
      <span className={`h-1.75 w-1.75 shrink-0 rounded-full ${dotBg}`} style={{ width: 7, height: 7 }} />
      <span className={`font-mono text-[9px] uppercase tracking-[1.5px] ${textColor}`}>{label}</span>
      <span className="font-mono text-[9px] text-ink3">
        {count} violation{count !== 1 ? "s" : ""}
      </span>
      <div className="h-px min-w-[20px] flex-1 bg-border" />
    </div>
  );
}

export default function Violations() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const ctx = useOutletContext<MainOutletContext | null>(null);
  const setProjectTopbar = ctx?.setProjectTopbar;

  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("projectId");

  const [activeChips, setActiveChips] = useState<Set<ChipKey>>(() => new Set(["all"]));
  const [ruleCategory, setRuleCategory] = useState<RuleCategoryKey>("");
  const [filters, setFilters] = useState<ViolationsListParams>(() => ({
    sort: "detectedAt",
    order: "desc",
    limit: 200,
    projectStatus: "ongoing",
    ...(projectIdFromUrl && { projectId: projectIdFromUrl }),
  }));

  const [activeViolationId, setActiveViolationId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ id: string; action: "confirm" | "dismiss" | "defer" | "resolve" } | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  useEffect(() => {
    setFilters((f) => ({ ...f, projectId: projectIdFromUrl ?? undefined }));
  }, [projectIdFromUrl]);

  const toggleChip = useCallback((key: ChipKey) => {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const listBase = useMemo(
    () => ({
      projectId: filters.projectId,
      projectStatus: filters.projectStatus ?? "ongoing",
      sort: "detectedAt" as const,
      order: "desc" as const,
      limit: 200,
    }),
    [filters.projectId, filters.projectStatus]
  );

  const { data: chipTotals } = useQuery({
    queryKey: ["violation-chip-totals", listBase, user?.id],
    queryFn: async () => {
      const b = { ...listBase, limit: 1 };
      const [all, crit, warn, post, res] = await Promise.all([
        violationsApi.list({ ...b }),
        violationsApi.list({ ...b, severity: "error" }),
        violationsApi.list({ ...b, severity: "warning" }),
        violationsApi.list({ ...b, status: "deferred" }),
        violationsApi.list({ ...b, status: "resolved" }),
      ]);
      let myTot = 0;
      if (user?.id) {
        const m = await violationsApi.list({ ...b, reviewedBy: user.id });
        myTot = m.total;
      }
      return {
        all: all.total,
        critical: crit.total,
        warning: warn.total,
        postponed: post.total,
        resolved: res.total,
        my: myTot,
      };
    },
    enabled: Boolean(token),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["violations", listBase],
    queryFn: () => violationsApi.list(listBase),
    enabled: Boolean(token),
  });

  const rawItems = data?.items ?? [];

  const displayedItems = useMemo(() => {
    let rows = rawItems.filter((v) => passesChips(v, activeChips, user?.id));
    if (ruleCategory) {
      const key = ruleCategory as Exclude<RuleCategoryKey, "">;
      rows = rows.filter((v) => violationRuleCategory(v) === key);
    }
    return rows;
  }, [rawItems, activeChips, ruleCategory, user?.id]);

  const criticalItems = useMemo(
    () => displayedItems.filter((v) => v.severity === "error" || v.severity === "critical"),
    [displayedItems]
  );
  const warningItems = useMemo(() => displayedItems.filter((v) => v.severity === "warning"), [displayedItems]);
  const infoItems = useMemo(() => displayedItems.filter((v) => v.severity === "info"), [displayedItems]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: () => projectsApi.list(),
    enabled: Boolean(token),
  });

  const { data: historyData } = useQuery({
    queryKey: ["violation-history", historyId],
    queryFn: () => violationsApi.getHistory(historyId!),
    enabled: !!historyId,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
      comment,
    }: {
      id: string;
      action: "confirm" | "dismiss" | "defer" | "resolve";
      reason?: string;
      comment?: string;
    }) => violationsApi.update(id, { action, reason, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["violations"] });
      queryClient.invalidateQueries({ queryKey: ["violation-chip-totals"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "stats"] });
      setActionModal(null);
    },
  });

  const handleExportPdf = useCallback(async () => {
    const list = displayedItems;
    if (!list.length) return;
    const v = list[0];
    try {
      const [run, plan] = await Promise.all([runsApi.get(v.runId), plansApi.get(v.planId)]);
      const { exportReportAsPdf } = await import("../report/exportPdf");
      exportReportAsPdf({ plan: { name: plan.name, fileName: plan.fileName }, run, planId: plan.id });
    } catch {
      /* ignore */
    }
  }, [displayedItems]);

  useEffect(() => {
    if (!setProjectTopbar) return;
    setProjectTopbar(
      <button
        type="button"
        onClick={() => void handleExportPdf()}
        className="rounded-sm border border-border2 bg-transparent px-3 py-1.5 font-sans text-[11px] font-semibold tracking-wide text-ink hover:border-ink2"
      >
        Export PDF ↗
      </button>
    );
    return () => setProjectTopbar(null);
  }, [setProjectTopbar, handleExportPdf]);

  const toggleRow = useCallback((id: string) => {
    setActiveViolationId((cur) => (cur === id ? null : id));
  }, []);

  const canReview = true;

  const handleAction = (reason?: string, comment?: string) => {
    if (!actionModal) return;
    updateMutation.mutate({
      id: actionModal.id,
      action: actionModal.action,
      reason,
      comment,
    });
  };

  const totals = chipTotals ?? { all: 0, critical: 0, warning: 0, postponed: 0, resolved: 0, my: 0 };

  const rightSummaryTotal = displayedItems.length;
  const breakdownCrit = displayedItems.filter((v) => v.severity === "error" || v.severity === "critical").length;
  const breakdownWarn = displayedItems.filter((v) => v.severity === "warning").length;
  const breakdownResolved = displayedItems.filter((v) => v.status === "resolved").length;
  const barDen = Math.max(1, rightSummaryTotal);

  const subtitlePlan =
    displayedItems[0] && filters.projectId
      ? `${displayedItems[0].projectName} · ${displayedItems[0].planName}`
      : displayedItems[0]
        ? `${displayedItems[0].projectName} · ${displayedItems[0].planName}`
        : "—";

  const byStatusRows = useMemo(() => {
    const o = (s: string) => displayedItems.filter((v) => v.status === s).length;
    return [
      { key: "open", label: "Open", color: "text-red", dot: "bg-red", n: o("open") },
      { key: "confirmed", label: "Confirmed", color: "text-amber", dot: "bg-amber", n: o("confirmed") },
      { key: "deferred", label: "Deferred", color: "text-blue", dot: "bg-blue", n: o("deferred") },
      { key: "resolved", label: "Resolved", color: "text-green", dot: "bg-green", n: o("resolved") },
    ];
  }, [displayedItems]);

  const byRuleTypeRows = useMemo(() => {
    const keys = RULE_TYPE_OPTIONS.filter((o) => o.value).map((o) => o.value as Exclude<RuleCategoryKey, "">);
    const map = new Map<string, ViolationListItem[]>();
    for (const k of keys) map.set(k, []);
    for (const v of displayedItems) {
      const k = violationRuleCategory(v);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(v);
    }
    return keys
      .map((k) => {
        const list = map.get(k) ?? [];
        const hasCrit = list.some((v) => v.severity === "error" || v.severity === "critical");
        const label = RULE_TYPE_OPTIONS.find((o) => o.value === k)?.label ?? k;
        return { key: k, label, count: list.length, hasCrit };
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [displayedItems]);

  const sectionBlocks = useMemo(() => {
    const blocks: { key: string; items: ViolationListItem[]; header: React.ReactNode }[] = [];
    if (criticalItems.length)
      blocks.push({
        key: "crit",
        items: criticalItems,
        header: <StickySectionHeaderFixed label="Critical" count={criticalItems.length} colorVar="red" />,
      });
    if (warningItems.length)
      blocks.push({
        key: "warn",
        items: warningItems,
        header: <StickySectionHeaderFixed label="Warning" count={warningItems.length} colorVar="amber" />,
      });
    if (infoItems.length)
      blocks.push({
        key: "info",
        items: infoItems,
        header: <StickySectionHeaderFixed label="Info" count={infoItems.length} colorVar="blue" />,
      });
    return blocks;
  }, [criticalItems, warningItems, infoItems]);

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col gap-0 lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-border lg:border-r">
        <div
          className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-bg px-6 py-3.5"
          style={{ padding: "14px 24px" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Chip variant="default" active={activeChips.has("all")} onClick={() => toggleChip("all")}>
              All ({totals.all})
            </Chip>
            <Chip variant="critical" active={activeChips.has("critical")} onClick={() => toggleChip("critical")}>
              Critical ({totals.critical})
            </Chip>
            <Chip variant="warning" active={activeChips.has("warning")} onClick={() => toggleChip("warning")}>
              Warning ({totals.warning})
            </Chip>
            <Chip variant="default" active={activeChips.has("postponed")} onClick={() => toggleChip("postponed")}>
              Postponed ({totals.postponed})
            </Chip>
            <Chip variant="default" active={activeChips.has("resolved")} onClick={() => toggleChip("resolved")}>
              Resolved ({totals.resolved})
            </Chip>
            {user?.id && (
              <Chip variant="default" active={activeChips.has("my")} onClick={() => toggleChip("my")}>
                My decisions ({totals.my})
              </Chip>
            )}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              className={selectViolationsClass}
              style={{ borderRadius: 2, padding: "4px 8px" }}
              value={filters.projectId ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  projectId: e.target.value || undefined,
                }))
              }
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className={selectViolationsClass}
              style={{ borderRadius: 2, padding: "4px 8px" }}
              value={ruleCategory}
              onChange={(e) => setRuleCategory(e.target.value as RuleCategoryKey)}
            >
              {RULE_TYPE_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="px-6 py-12 text-center font-mono text-[10px] text-ink3">Loading violations…</p>
          ) : displayedItems.length === 0 ? (
            <div className="flex min-h-[40vh] items-center justify-center px-6">
              <p className="text-center font-mono text-[10px] text-ink3">No violations match the current filters</p>
            </div>
          ) : (
            <div>
              {sectionBlocks.map((block, bi) => {
                const start = sectionBlocks.slice(0, bi).reduce((s, b) => s + b.items.length, 0);
                return (
                  <div key={block.key}>
                    {block.header}
                    <ul>
                      {block.items.map((v, i) => (
                        <ViolationRow
                          key={v.id}
                          v={v}
                          expanded={activeViolationId === v.id}
                          onToggle={() => toggleRow(v.id)}
                          rowAnimIndex={start + i}
                          onConfirm={() => setActionModal({ id: v.id, action: "confirm" })}
                          onDefer={() => setActionModal({ id: v.id, action: "defer" })}
                          onDismiss={() => setActionModal({ id: v.id, action: "dismiss" })}
                          onHistory={() => setHistoryId(v.id)}
                          canReview={canReview}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <aside
        className="violation-panel-animate flex w-full shrink-0 flex-col gap-5 overflow-y-auto lg:w-[380px]"
        style={{ background: "var(--bg)", padding: "24px 20px", gap: 20 }}
      >
        <section className="rounded-md p-5 text-[var(--run-meta)]" style={{ background: "var(--side)", padding: 20 }}>
          <p
            className="mb-2.5 font-mono text-[8px] uppercase tracking-[1.8px]"
            style={{ color: "#3A3A2A" }}
          >
            Summary
          </p>
          <p className="font-serif text-[48px] font-semibold leading-none tracking-[-2px] text-[#F4F1EB]" style={{ fontFamily: "Fraunces, serif" }}>
            {rightSummaryTotal}
          </p>
          <p className="mb-3.5 mt-1 font-mono text-[9px]" style={{ color: "#3A3A2A" }}>
            {subtitlePlan}
          </p>
          <div className="space-y-2.5">
            {[
              { label: "Critical", n: breakdownCrit, c: "#F0A0A0" },
              { label: "Warning", n: breakdownWarn, c: "#E8B86A" },
              { label: "Resolved", n: breakdownResolved, c: "#7EC89A" },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-0.5 flex items-center justify-between font-mono text-[9px] uppercase" style={{ color: row.c }}>
                  <span>{row.label}</span>
                  <span className="font-serif text-base font-semibold" style={{ fontFamily: "Fraunces, serif", color: row.c }}>
                    {row.n}
                  </span>
                </div>
                <div className="h-0.5 w-full rounded-sm" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-sm" style={{ width: `${Math.min(100, (row.n / barDen) * 100)}%`, background: row.c }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-border bg-card">
          <div className="border-b border-border bg-white px-4 py-3">
            <h3 className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink">By status</h3>
            <p className="mt-0.5 font-mono text-[9px] text-ink3">Workflow progress</p>
          </div>
          <ul>
            {byStatusRows.map((r) => (
              <li
                key={r.key}
                className="flex items-center gap-2 border-b border-border px-4 py-2.5 transition-colors last:border-b-0 hover:bg-bg"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.dot}`} />
                <span className="flex-1 font-sans text-[11px] font-medium text-ink">{r.label}</span>
                <span className={`font-serif text-base font-semibold ${r.color}`} style={{ fontFamily: "Fraunces, serif" }}>
                  {r.n}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-md border border-border bg-card">
          <div className="border-b border-border bg-white px-4 py-3">
            <h3 className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink">By rule type</h3>
            <p className="mt-0.5 font-mono text-[9px] text-ink3">Most frequent violations</p>
          </div>
          <ul>
            {byRuleTypeRows.length === 0 ? (
              <li className="px-4 py-6 font-mono text-[9px] text-ink3">No data</li>
            ) : (
              byRuleTypeRows.map((r) => (
                <li
                  key={r.key}
                  className="flex items-center gap-2 border-b border-border px-4 py-2.5 last:border-b-0"
                >
                  <span className="min-w-0 flex-1 truncate font-sans text-[11px] font-medium text-ink">{r.label}</span>
                  <span
                    className={`shrink-0 rounded-sm px-1.5 py-px font-mono text-[9px] ${r.hasCrit ? "bg-red-soft text-red" : "bg-amber-soft text-[#9A5010]"}`}
                    style={{ borderRadius: 2 }}
                  >
                    {r.count}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <div
          className="rounded-md border border-border bg-card font-mono text-[9px] leading-[1.7] text-ink3"
          style={{ padding: "12px 14px" }}
        >
          BauPilot lists possible code findings only. It does not replace official review. Always verify against applicable
          LBO / DIN and project-specific requirements.
        </div>
      </aside>

      {actionModal && (
        <ViolationActionModal
          isOpen
          onClose={() => setActionModal(null)}
          action={actionModal.action}
          onSubmit={handleAction}
          isPending={updateMutation.isPending}
        />
      )}

      <HistoryModal
        isOpen={!!historyId}
        onClose={() => setHistoryId(null)}
        violationId={historyId ?? ""}
        currentStatus={historyData?.currentStatus ?? "open"}
        history={historyData?.history ?? []}
      />
    </div>
  );
}
