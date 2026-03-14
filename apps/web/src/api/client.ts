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
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
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

// Projects
export interface ProjectSummary {
  id: string;
  name: string;
  zipCode?: string;
  state?: string;
  createdAt: string;
  planCount: number;
}

export const projectsApi = {
  list: () => api<ProjectSummary[]>("/projects"),
  create: (name: string, zipCode: string) =>
    api<ProjectSummary>("/projects", { method: "POST", body: { name, zipCode } }),
  get: (id: string) => api<ProjectSummary>(`/projects/${id}`),
  update: (id: string, data: { name?: string; zipCode?: string | null }) =>
    api<ProjectSummary>(`/projects/${id}`, { method: "PATCH", body: data }),
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
    form.append("file", file);
    form.append("projectId", projectId);
    if (name) form.append("name", name);
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
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  suggestion?: string;
  elementIds: string[];
  actualValue?: number;
  requiredValue?: number;
  regulationRef?: string;
}

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
  create: (planId: string) =>
    api<RunDetail>("/runs", { method: "POST", body: { planId } }),
  get: (runId: string) => api<RunDetail>(`/runs/${runId}`),
};

