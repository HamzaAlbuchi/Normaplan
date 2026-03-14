/**
 * Role-based access control for BauPilot.
 * Roles: owner, manager, architect, reviewer, viewer
 */

import { prisma } from "./db.js";

export const ROLES = ["owner", "manager", "architect", "reviewer", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export interface OrgContext {
  organizationId: string;
  role: Role;
}

export async function getOrgContext(userId: string): Promise<OrgContext[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });
  return memberships.map((m) => ({ organizationId: m.organizationId, role: m.role as Role }));
}

export async function getDefaultOrg(userId: string): Promise<OrgContext | null> {
  const contexts = await getOrgContext(userId);
  return contexts[0] ?? null;
}

/** Check if user can access project (view or more) */
export async function canAccessProject(
  userId: string,
  projectId: string
): Promise<{ ok: boolean; orgId?: string; role?: Role }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: { include: { memberships: { where: { userId } } } }, assignments: { where: { userId } } },
  });
  if (!project) return { ok: false };

  const membership = project.organization.memberships[0];
  const isAssigned = project.assignments.length > 0;

  if (membership) {
    const role = membership.role as Role;
    if (["owner", "manager", "reviewer", "viewer"].includes(role)) return { ok: true, orgId: project.organizationId, role };
    if (role === "architect" && isAssigned) return { ok: true, orgId: project.organizationId, role };
  }
  return { ok: false };
}

/** Check if user can manage project (create, edit, assign, delete) */
export async function canManageProject(userId: string, projectId: string): Promise<boolean> {
  const contexts = await getOrgContext(userId);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });
  if (!project) return false;
  const ctx = contexts.find((c) => c.organizationId === project.organizationId);
  return ctx ? ["owner", "manager"].includes(ctx.role) : false;
}

/** Check if user can create projects in org */
export async function canCreateProject(userId: string, organizationId: string): Promise<boolean> {
  const ctx = (await getOrgContext(userId)).find((c) => c.organizationId === organizationId);
  return ctx ? ["owner", "manager"].includes(ctx.role) : false;
}

/** Check if user can upload plans / run checks (architect work) */
export async function canWorkOnProject(userId: string, projectId: string): Promise<boolean> {
  const access = await canAccessProject(userId, projectId);
  if (!access.ok) return false;
  if (access.role === "viewer") return false;
  if (access.role === "architect") {
    const assigned = await prisma.projectAssignment.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return !!assigned;
  }
  return true; // owner, manager, reviewer
}

/** Check if user can review violations (dismiss/defer) */
export async function canReviewViolations(userId: string, projectId: string): Promise<boolean> {
  const access = await canAccessProject(userId, projectId);
  if (!access.ok) return false;
  return ["owner", "manager", "architect", "reviewer"].includes(access.role ?? "");
}

/** List project IDs user can access (for manager: all in org; architect: assigned only) */
export async function listAccessibleProjectIds(userId: string): Promise<string[]> {
  const contexts = await getOrgContext(userId);
  const projectIds: string[] = [];

  for (const ctx of contexts) {
    if (["owner", "manager", "reviewer", "viewer"].includes(ctx.role)) {
      const projects = await prisma.project.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true },
      });
      projectIds.push(...projects.map((p) => p.id));
    } else if (ctx.role === "architect") {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId },
        select: { projectId: true },
      });
      projectIds.push(...assignments.map((a) => a.projectId));
    }
  }

  return [...new Set(projectIds)];
}
