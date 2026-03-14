import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { getOrgContext } from "../rbac.js";

const ROLES = ["owner", "manager", "architect", "reviewer", "viewer"] as const;
const inviteBody = z.object({
  email: z.string().email(),
  role: z.enum(ROLES),
});
const updateRoleBody = z.object({ role: z.enum(ROLES) });

export async function membershipRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user = await requireAuth(
        req.headers.authorization
      );
    } catch {
      return reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
    }
  });

  app.get("/org/:orgId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { orgId } = req.params as { orgId: string };
    const ctx = (await getOrgContext(user.id)).find((c) => c.organizationId === orgId);
    if (!ctx) return reply.status(404).send({ code: "NOT_FOUND", message: "Organization not found" });
    if (!["owner", "manager"].includes(ctx.role))
      return reply.status(403).send({ code: "FORBIDDEN", message: "Only owners and managers can view members" });

    const memberships = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
    }));
  });

  app.post("/org/:orgId/invite", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { orgId } = req.params as { orgId: string };
    const body = inviteBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });

    const ctx = (await getOrgContext(user.id)).find((c) => c.organizationId === orgId);
    if (!ctx) return reply.status(404).send({ code: "NOT_FOUND", message: "Organization not found" });
    if (ctx.role !== "owner")
      return reply.status(403).send({ code: "FORBIDDEN", message: "Only owners can invite members" });

    const invitee = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!invitee) return reply.status(404).send({ code: "USER_NOT_FOUND", message: "User not found. They must register first." });

    const existing = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: invitee.id, organizationId: orgId } },
    });
    if (existing) return reply.status(409).send({ code: "ALREADY_MEMBER", message: "User is already a member" });

    const membership = await prisma.membership.create({
      data: { userId: invitee.id, organizationId: orgId, role: body.data.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return reply.status(201).send({
      id: membership.id,
      userId: membership.userId,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role,
    });
  });

  app.patch("/:membershipId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { membershipId } = req.params as { membershipId: string };
    const body = updateRoleBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });

    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { organization: true },
    });
    if (!membership) return reply.status(404).send({ code: "NOT_FOUND", message: "Membership not found" });

    const ctx = (await getOrgContext(user.id)).find((c) => c.organizationId === membership.organizationId);
    if (!ctx || ctx.role !== "owner")
      return reply.status(403).send({ code: "FORBIDDEN", message: "Only owners can change roles" });

    if (body.data.role === "owner") {
      const ownerCount = await prisma.membership.count({
        where: { organizationId: membership.organizationId, role: "owner" },
      });
      if (ownerCount <= 1 && membership.role === "owner")
        return reply.status(400).send({ code: "LAST_OWNER", message: "Cannot change role of last owner" });
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { role: body.data.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return { id: updated.id, userId: updated.userId, email: updated.user.email, name: updated.user.name, role: updated.role };
  });

  app.delete("/:membershipId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { membershipId } = req.params as { membershipId: string };

    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { organization: true },
    });
    if (!membership) return reply.status(404).send({ code: "NOT_FOUND", message: "Membership not found" });

    const ctx = (await getOrgContext(user.id)).find((c) => c.organizationId === membership.organizationId);
    if (!ctx) return reply.status(404).send({ code: "NOT_FOUND", message: "Organization not found" });
    if (ctx.role !== "owner" && user.id !== membership.userId)
      return reply.status(403).send({ code: "FORBIDDEN", message: "Only owners can remove others" });

    if (membership.role === "owner" && user.id === membership.userId) {
      const ownerCount = await prisma.membership.count({
        where: { organizationId: membership.organizationId, role: "owner" },
      });
      if (ownerCount <= 1)
        return reply.status(400).send({ code: "LAST_OWNER", message: "Transfer ownership before leaving" });
    }

    await prisma.membership.delete({ where: { id: membershipId } });
    return reply.status(204).send();
  });
}
