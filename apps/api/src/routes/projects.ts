import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { parseGermanZipCode } from "../plzToState.js";
import {
  listAccessibleProjectIds,
  canCreateProject,
  canManageProject,
  canWorkOnProject,
  canAccessProject,
  getDefaultOrg,
} from "../rbac.js";

const PROJECT_TYPES = ["residential", "commercial", "mixed_use", "industrial", "education", "healthcare", "other"] as const;

const createBody = z.object({
  name: z.string().min(1),
  zipCode: z.string().length(5).regex(/^[0-9]{5}$/),
  projectType: z.enum(PROJECT_TYPES).optional(),
  organizationId: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().cuid().optional()
  ),
});
const updateBody = z.object({
  name: z.string().min(1).optional(),
  zipCode: z.string().length(5).regex(/^[0-9]{5}$/).optional(),
  projectType: z.enum(PROJECT_TYPES).optional().nullable(),
});
const assignBody = z.object({ userId: z.string().cuid() });

export async function projectRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user = await requireAuth(
        req.headers.authorization
      );
    } catch {
      return reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
    }
  });

  app.get("/stats", async (req) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const projectIds = await listAccessibleProjectIds(user.id);
    const runs = await prisma.ruleRun.findMany({
      where: { plan: { projectId: { in: projectIds } } },
      select: { warningCount: true, errorCount: true, checkedAt: true },
      orderBy: { checkedAt: "desc" },
    });
    const lastRun = runs[0];
    return {
      runCount: runs.length,
      warningCount: runs.reduce((s, r) => s + r.warningCount, 0),
      errorCount: runs.reduce((s, r) => s + r.errorCount, 0),
      lastRunAt: lastRun?.checkedAt?.toISOString() ?? null,
    };
  });

  app.get("/", async (req) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const projectIds = await listAccessibleProjectIds(user.id);
    if (projectIds.length === 0) return [];

    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { plans: true } },
        assignments: { include: { user: { select: { id: true, email: true, name: true } } } },
      },
    });
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      zipCode: p.zipCode,
      state: p.state,
      organizationId: p.organizationId,
      projectType: p.projectType,
      createdAt: p.createdAt.toISOString(),
      planCount: p._count.plans,
      architects: p.assignments.map((a) => ({ id: a.user.id, email: a.user.email, name: a.user.name })),
    }));
  });

  app.post("/", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const body = createBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });

    let orgId = body.data.organizationId;
    if (!orgId) {
      const defaultOrg = await getDefaultOrg(user.id);
      if (!defaultOrg) return reply.status(400).send({ code: "NO_ORG", message: "Create or join an organization first" });
      orgId = defaultOrg.organizationId;
    }

    if (!(await canCreateProject(user.id, orgId)))
      return reply.status(403).send({ code: "FORBIDDEN", message: "Cannot create projects in this organization" });

    const zipCode = String(body.data.zipCode).trim();
    const state = parseGermanZipCode(zipCode);
    if (!state)
      return reply.status(400).send({ code: "INVALID_ZIP", message: "Ungültige deutsche Postleitzahl (5 Ziffern)." });

    const project = await prisma.project.create({
      data: {
        name: body.data.name,
        organizationId: orgId,
        zipCode,
        state,
        projectType: body.data.projectType ?? null,
      },
      include: { _count: { select: { plans: true } } },
    });
    return reply.status(201).send({
      id: project.id,
      name: project.name,
      zipCode: project.zipCode,
      state: project.state,
      organizationId: project.organizationId,
      projectType: project.projectType,
      createdAt: project.createdAt.toISOString(),
      planCount: 0,
    });
  });

  app.get("/:projectId/violation-stats", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId } = req.params as { projectId: string };
    const access = await canAccessProject(user.id, projectId);
    if (!access.ok) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });

    const [total, openCount, criticalCount] = await Promise.all([
      prisma.ruleViolation.count({
        where: { run: { plan: { projectId } } },
      }),
      prisma.ruleViolation.count({
        where: { run: { plan: { projectId } }, status: "open" },
      }),
      prisma.ruleViolation.count({
        where: { run: { plan: { projectId } }, severity: "error" },
      }),
    ]);
    return { total, openCount, criticalCount };
  });

  app.get("/:projectId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId } = req.params as { projectId: string };
    const access = await listAccessibleProjectIds(user.id);
    if (!access.includes(projectId)) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });

    const project = await prisma.project.findFirst({
      where: { id: projectId },
      include: {
        _count: { select: { plans: true } },
        organization: { select: { name: true } },
        assignments: { include: { user: { select: { id: true, email: true, name: true } } } },
      },
    });
    if (!project) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });
    return {
      id: project.id,
      name: project.name,
      zipCode: project.zipCode,
      state: project.state,
      organizationId: project.organizationId,
      projectType: project.projectType,
      organizationName: project.organization.name,
      createdAt: project.createdAt.toISOString(),
      planCount: project._count.plans,
      architects: project.assignments.map((a) => ({ id: a.user.id, email: a.user.email, name: a.user.name })),
    };
  });

  app.patch("/:projectId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId } = req.params as { projectId: string };
    const body = updateBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });

    if (!(await canManageProject(user.id, projectId)))
      return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });

    const zipCode = body.data.zipCode !== undefined ? String(body.data.zipCode).trim() : project.zipCode;
    const state = parseGermanZipCode(zipCode);
    if (!state)
      return reply.status(400).send({ code: "INVALID_ZIP", message: "Ungültige deutsche Postleitzahl (5 Ziffern)." });

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(body.data.name !== undefined && { name: body.data.name }),
        ...(body.data.zipCode !== undefined && { zipCode, state }),
      },
      include: { _count: { select: { plans: true } } },
    });
    return {
      id: updated.id,
      name: updated.name,
      zipCode: updated.zipCode,
      state: updated.state,
      organizationId: updated.organizationId,
      projectType: updated.projectType,
      createdAt: updated.createdAt.toISOString(),
      planCount: updated._count.plans,
    };
  });

  app.get("/:projectId/assignments", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId } = req.params as { projectId: string };
    if (!(await canManageProject(user.id, projectId)))
      return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });

    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return assignments.map((a) => ({ userId: a.userId, email: a.user.email, name: a.user.name }));
  });

  app.post("/:projectId/assignments", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId } = req.params as { projectId: string };
    const body = assignBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });

    if (!(await canManageProject(user.id, projectId)))
      return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { organization: { include: { memberships: { where: { userId: body.data.userId } } } } },
    });
    if (!project) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });
    const membership = project.organization.memberships[0];
    if (!membership || membership.role !== "architect")
      return reply.status(400).send({ code: "NOT_ARCHITECT", message: "User must be an architect in this organization" });

    await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId, userId: body.data.userId } },
      create: { projectId, userId: body.data.userId },
      update: {},
    });
    return reply.status(204).send();
  });

  app.delete("/:projectId/assignments/:userId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId, userId } = req.params as { projectId: string; userId: string };
    if (!(await canManageProject(user.id, projectId)))
      return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });

    await prisma.projectAssignment.deleteMany({
      where: { projectId, userId },
    });
    return reply.status(204).send();
  });
}
