const API_BASE = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "baupilot_token";

function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: Record<string, unknown> | FormData;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, ...rest } = options;
  const headers = new Headers(rest.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_BASE}${path}`.replace(/([^:]\/)\/+/g, "$1");
  const res = await fetch(url, {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      if (data && typeof data === "object" && ("message" in data || "code" in data)) {
        message = String((data as { message?: string; code?: string }).message ?? (data as { code?: string }).code ?? message);
      }
    } catch {
      // ignore
    }
    throw new Error(message || String(res.status));
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as T;
  try {
    return await res.json() as T;
  } catch {
    throw new Error("Invalid JSON response");
  }
}

// Auth
export interface OrgMembership {
  id: string;
  name: string;
  role: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
  organizations?: OrgMembership[];
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: UserProfile }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  register: (email: string, password: string, invitationKey: string, name?: string) =>
    api<{ token: string; user: UserProfile }>("/auth/register", {
      method: "POST",
      body: { email, password, invitationKey, name },
    }),
  getMe: () => api<UserProfile>("/auth/me"),
  updateProfile: (data: { name?: string }) =>
    api<UserProfile>("/auth/me", { method: "PATCH", body: data }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ ok: boolean }>("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    }),
};

// Organizations
export interface OrgSummary {
  id: string;
  name: string;
  role: string;
  projectCount: number;
  memberCount: number;
}

export const organizationsApi = {
  list: () => api<OrgSummary[]>("/organizations"),
  create: (name: string) =>
    api<OrgSummary>("/organizations", { method: "POST", body: { name } }),
  get: (id: string) => api<OrgSummary>(`/organizations/${id}`),
};

// Memberships
export interface MemberSummary {
  id: string;
  userId: string;
  email: string;
  name?: string;
  role: string;
  createdAt: string;
}

export const membershipsApi = {
  listByOrg: (orgId: string) =>
    api<MemberSummary[]>(`/memberships/org/${orgId}`),
  invite: (orgId: string, email: string, role: string) =>
    api<MemberSummary>("/memberships/org/" + orgId + "/invite", {
      method: "POST",
      body: { email, role },
    }),
  updateRole: (membershipId: string, role: string) =>
    api<MemberSummary>(`/memberships/${membershipId}`, {
      method: "PATCH",
      body: { role },
    }),
  remove: (membershipId: string) =>
    api<void>(`/memberships/${membershipId}`, { method: "DELETE" }),
};

// Projects
export const PROJECT_TYPES = [
  { value: "residential", label: "Wohngebäude" },
  { value: "commercial", label: "Gewerbe" },
  { value: "mixed_use", label: "Mischnutzung" },
  { value: "industrial", label: "Industrie" },
  { value: "education", label: "Bildungsbauten" },
  { value: "healthcare", label: "Gesundheitswesen" },
  { value: "other", label: "Sonstige" },
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number]["value"];

export interface ProjectSummary {
  id: string;
  name: string;
  zipCode?: string;
  state?: string;
  organizationId?: string;
  projectType?: ProjectType | null;
  status?: ProjectStatus;
  createdAt: string;
  planCount: number;
  architects?: { id: string; email: string; name?: string }[];
}

export interface DashboardStats {
  runCount: number;
  warningCount: number;
  errorCount: number;
  infoCount?: number;
  lastRunAt?: string | null;
}

export const PROJECT_STATUSES = [
  { value: "ongoing", label: "Laufend" },
  { value: "paused", label: "Pausiert" },
  { value: "ended", label: "Abgeschlossen" },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"];

export interface ProjectDetail extends ProjectSummary {
  organizationName?: string;
}

export const projectsApi = {
  list: () => api<ProjectSummary[]>("/projects"),
  getStats: () => api<DashboardStats>("/projects/stats"),
  create: (name: string, zipCode: string, projectType?: ProjectType | null, organizationId?: string) =>
    api<ProjectSummary>("/projects", {
      method: "POST",
      body: {
        name,
        zipCode,
        ...(projectType ? { projectType } : {}),
        ...(organizationId && organizationId.trim() ? { organizationId: organizationId.trim() } : {}),
      },
    }),
  get: (id: string) => api<ProjectDetail>(`/projects/${id}`),
  update: (id: string, data: { name?: string; zipCode?: string | null; projectType?: ProjectType | null; status?: ProjectStatus }) =>
    api<ProjectSummary>(`/projects/${id}`, { method: "PATCH", body: data }),
  getViolationStats: (projectId: string) =>
    api<{ total: number; openCount: number; criticalCount: number; resolvedCount: number }>(
      `/projects/${projectId}/violation-stats`
    ),
  listRuns: (projectId: string) =>
    api<
      {
        id: string;
        planId: string;
        planName: string;
        fileName: string;
        checkedAt: string;
        violationCount: number;
        warningCount: number;
        errorCount: number;
      }[]
    >(`/projects/${projectId}/runs`),
  listAssignments: (projectId: string) =>
    api<{ userId: string; email: string; name?: string }[]>(`/projects/${projectId}/assignments`),
  addAssignment: (projectId: string, userId: string) =>
    api<void>(`/projects/${projectId}/assignments`, { method: "POST", body: { userId } }),
  removeAssignment: (projectId: string, userId: string) =>
    api<void>(`/projects/${projectId}/assignments/${userId}`, { method: "DELETE" }),
  delete: (id: string) =>
    api<void>(`/projects/${id}`, { method: "DELETE" }),
};

// Plans
export interface PlanSummary {
  id: string;
  projectId: string;
  name: string;
  fileName: string;
  status: string;
  createdAt: string;
  lastRunId?: string;
}

export interface PlanDetail extends PlanSummary {
  elements?: unknown;
  extractionError?: string;
}

export const plansApi = {
  upload: (projectId: string, file: File, name?: string) => {
    const form = new FormData();
    // Append fields before file so multipart parser receives them before consuming the file stream
    form.append("projectId", projectId);
    form.append("filename", file.name);
    if (name) form.append("name", name);
    form.append("file", file);
    return api<PlanSummary>("/plans/upload", { method: "POST", body: form });
  },
  get: (planId: string) => api<PlanDetail>(`/plans/${planId}`),
  listByProject: (projectId: string) =>
    api<PlanSummary[]>(`/plans/project/${projectId}`),
  delete: (planId: string) =>
    api<void>(`/plans/${planId}`, { method: "DELETE" }),
};

// Runs
export interface Violation {
  id?: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  suggestion?: string;
  elementIds: string[];
  actualValue?: number;
  requiredValue?: number;
  regulationRef?: string;
  status?: string;
  reason?: string;
  comment?: string;
  decidedAt?: string;
}

// Violation review
export const DISMISS_REASONS = [
  { value: "false_positive", label: "Falscher Treffer (False Positive)" },
  { value: "not_applicable", label: "Nicht anwendbar" },
  { value: "extraction_error", label: "Extraktionsfehler" },
  { value: "exception_case", label: "Ausnahmefall" },
] as const;

export const DEFER_REASONS = [
  { value: "will_fix_later", label: "Wird später behoben" },
  { value: "waiting_for_client_input", label: "Warte auf Angaben des Auftraggebers" },
  { value: "waiting_for_consultant_input", label: "Warte auf Stellungnahme des Fachplaners" },
  { value: "non_blocking_for_current_phase", label: "Für aktuelle Phase nicht relevant" },
] as const;

export const REASON_LABELS: Record<string, string> = Object.fromEntries([
  ...DISMISS_REASONS.map((r) => [r.value, r.label]),
  ...DEFER_REASONS.map((r) => [r.value, r.label]),
]);

export interface ViolationHistoryEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  comment?: string;
  createdAt: string;
  user: { id: string; email: string; name?: string };
}

export interface ViolationListItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  projectId: string;
  projectName: string;
  planId: string;
  planName: string;
  runId: string;
  elementIds: string[];
  ruleId: string;
  ruleName: string;
  actualValue?: number;
  requiredValue?: number;
  regulationRef?: string;
  suggestion?: string;
  detectedAt: string;
  updatedAt: string;
  reviewedBy?: { id: string; email: string; name?: string };
  reviewedAt?: string;
  reason?: string;
  comment?: string;
}

export interface ViolationsListParams {
  status?: string;
  severity?: string;
  projectId?: string;
  projectStatus?: string; // comma-sep: ongoing,paused,ended
  ruleId?: string;
  reviewedBy?: string;
  sort?: "detectedAt" | "updatedAt";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface RuleTypeOption {
  id: string;
  name: string;
}

export const violationsApi = {
  listRuleTypes: () => api<RuleTypeOption[]>("/violations/rule-types"),
  list: (params?: ViolationsListParams) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v != null && q.set(k, String(v)));
    return api<{ items: ViolationListItem[]; total: number }>(`/violations?${q}`);
  },
  get: (id: string) => api<ViolationListItem>(`/violations/${id}`),
  update: (violationId: string, data: { action: "confirm" | "dismiss" | "defer" | "resolve"; reason?: string; comment?: string }) =>
    api<ViolationListItem>(`/violations/${violationId}`, { method: "PATCH", body: data }),
  getHistory: (violationId: string) =>
    api<{ violationId: string; currentStatus: string; history: ViolationHistoryEntry[] }>(
      `/violations/${violationId}/history`
    ),
};

export interface RunDetail {
  id: string;
  planId: string;
  checkedAt: string;
  violationCount: number;
  warningCount: number;
  errorCount: number;
  violations: Violation[];
}

export const runsApi = {
  create: (planId: string, options?: { categories?: string[] }) =>
    api<RunDetail>("/runs", {
      method: "POST",
      body: { planId, categories: options?.categories },
    }),
  get: (runId: string) => api<RunDetail>(`/runs/${runId}`),
};

// Admin
export interface AdminStats {
  userCount: number;
  projectCount: number;
  runCount: number;
  violationCount: number;
  warningCount: number;
  errorCount: number;
}

export interface AdminUserProject {
  id: string;
  name: string;
  state: string;
  planCount: number;
  runs: {
    id: string;
    planId: string;
    planName: string;
    checkedAt: string;
    violationCount: number;
    warningCount: number;
    errorCount: number;
  }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  projectCount: number;
  planCount: number;
  runCount: number;
  violationCount: number;
  projects: AdminUserProject[];
}

export const adminApi = {
  getStats: (params?: { projectStatus?: string }) => {
    const q = params?.projectStatus ? `?projectStatus=${encodeURIComponent(params.projectStatus)}` : "";
    return api<AdminStats>(`/admin/stats${q}`);
  },
  getUsers: () => api<AdminUser[]>("/admin/users"),
};

// Rules metadata (for Prüfumfang / scope page)
export interface RuleCheck {
  elementType: string;
  property: string;
  operator: string;
  severity: "info" | "warning" | "error";
  messageTemplate?: string;
  suggestion?: string;
}

export interface RuleMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  regulationRef?: string;
  applicableStates: string[];
  checks: RuleCheck[];
}

export interface RulesMetadataResponse {
  version: string;
  rules: RuleMetadata[];
}

export const rulesApi = {
  getMetadata: () => api<RulesMetadataResponse>("/rules"),
};

