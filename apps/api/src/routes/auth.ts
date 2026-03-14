import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword, createToken, requireAuth, isAdmin } from "../auth.js";

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  invitationKey: z.string().optional(),
});
const loginBody = z.object({ email: z.string().email(), password: z.string() });

function getValidInvitationKeys(): string[] {
  const raw = process.env.INVITATION_KEYS;
  if (!raw || typeof raw !== "string") return [];
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}
const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
const updateProfileBody = z.object({ name: z.string().min(0).max(200).optional() });

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const body = registerBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });
    const validKeys = getValidInvitationKeys();
    if (validKeys.length > 0) {
      const key = (body.data.invitationKey ?? "").trim();
      if (!key || !validKeys.includes(key)) {
        return reply.status(403).send({
          code: "INVALID_INVITATION_KEY",
          message: "Ungültiger oder abgelaufener Einladungsschlüssel.",
        });
      }
    }
    const existing = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (existing) return reply.status(409).send({ code: "EMAIL_EXISTS", message: "Email already registered" });
    const passwordHash = await hashPassword(body.data.password);
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email: body.data.email, passwordHash, name: body.data.name },
      });
      const org = await tx.organization.create({
        data: { name: (body.data.name || body.data.email.split("@")[0]) + " Büro" },
      });
      await tx.membership.create({
        data: { userId: u.id, organizationId: org.id, role: "owner" },
      });
      return u;
    });
    const token = await createToken(user.id, user.email);
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: { organization: { select: { id: true, name: true } } },
    });
    const organizations = memberships.map((m) => ({ id: m.organization.id, name: m.organization.name, role: m.role }));
    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name ?? undefined, isAdmin: isAdmin(user.email), organizations },
    });
  });

  app.post("/login", async (req, reply) => {
    const body = loginBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });
    const user = await prisma.user.findUnique({
      where: { email: body.data.email },
      include: { memberships: { include: { organization: { select: { id: true, name: true } } } } },
    });
    if (!user || !(await verifyPassword(user.passwordHash, body.data.password)))
      return reply.status(401).send({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    const token = await createToken(user.id, user.email);
    const organizations = user.memberships.map((m) => ({ id: m.organization.id, name: m.organization.name, role: m.role }));
    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name ?? undefined, isAdmin: isAdmin(user.email), organizations },
    });
  });

  app.get("/me", {
    preHandler: async (req, reply) => {
      try {
        (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user = await requireAuth(
          req.headers.authorization
        );
      } catch {
        return reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
      }
    },
  }, async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      include: { memberships: { include: { organization: { select: { id: true, name: true } } } } },
    });
    if (!u) return reply.status(404).send({ code: "NOT_FOUND", message: "User not found" });
    const orgs = u.memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
    }));
    return reply.send({
      id: u.id,
      email: u.email,
      name: u.name ?? undefined,
      isAdmin: isAdmin(u.email),
      organizations: orgs,
    });
  });

  app.patch("/me", {
    preHandler: async (req, reply) => {
      try {
        (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user = await requireAuth(
          req.headers.authorization
        );
      } catch {
        return reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
      }
    },
  }, async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const body = updateProfileBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: body.data.name !== undefined ? { name: body.data.name } : {},
    });
    return reply.send({ id: updated.id, email: updated.email, name: updated.name ?? undefined });
  });

  app.post("/change-password", {
    preHandler: async (req, reply) => {
      try {
        (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user = await requireAuth(
          req.headers.authorization
        );
      } catch {
        return reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
      }
    },
  }, async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const body = changePasswordBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });
    const u = await prisma.user.findUnique({ where: { id: user.id } });
    if (!u || !(await verifyPassword(u.passwordHash, body.data.currentPassword)))
      return reply.status(401).send({ code: "INVALID_PASSWORD", message: "Current password is incorrect" });
    const passwordHash = await hashPassword(body.data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return reply.send({ ok: true });
  });
}
