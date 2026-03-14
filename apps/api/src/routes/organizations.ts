import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { getOrgContext, canCreateProject } from "../rbac.js";

const createBody = z.object({ name: z.string().min(1).max(200) });

export async function organizationRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user = await requireAuth(
        req.headers.authorization
      );
    } catch {
      return reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
    }
  });

  app.get("/", async (req) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            _count: { select: { projects: true, memberships: true } },
          },
        },
      },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
      projectCount: m.organization._count.projects,
      memberCount: m.organization._count.memberships,
    }));
  });

  app.post("/", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const body = createBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });

    const org = await prisma.organization.create({
      data: { name: body.data.name },
    });
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: "owner" },
    });
    return reply.status(201).send({
      id: org.id,
      name: org.name,
      role: "owner",
      projectCount: 0,
      memberCount: 1,
    });
  });

  app.get("/:orgId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { orgId } = req.params as { orgId: string };
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, organizationId: orgId },
      include: {
        organization: {
          include: { _count: { select: { projects: true, memberships: true } } },
        },
      },
    });
    if (!membership) return reply.status(404).send({ code: "NOT_FOUND", message: "Organization not found" });
    return {
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role,
      projectCount: membership.organization._count.projects,
      memberCount: membership.organization._count.memberships,
    };
  });
}
