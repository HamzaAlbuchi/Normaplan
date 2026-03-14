const API_BASE = "/api";
const TOKEN_KEY = "baupilot_token";

function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { body?: object | FormData } = {}
): Promise<T> {
  const { body, ...rest } = options;
  const headers = new Headers(rest.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.code || String(res.status));
  }
  return res.json() as Promise<T>;
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: { id: string; email: string; name?: string } }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  register: (email: string, password: string, name?: string) =>
    api<{ token: string; user: { id: string; email: string; name?: string } }>("/auth/register", {
      method: "POST",
      body: { email, password, name },
    }),
};

// Projects
export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  planCount: number;
}

export const projectsApi = {
  list: () => api<ProjectSummary[]>("/projects"),
  create: (name: string) =>
    api<ProjectSummary>("/projects", { method: "POST", body: { name } }),
  get: (id: string) => api<ProjectSummary>(`/projects/${id}`),
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

