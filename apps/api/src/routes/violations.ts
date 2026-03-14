import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, isAdmin } from "../auth.js";
import { DISMISS_REASON_VALUES, DEFER_REASON_VALUES } from "../constants/reviewReasons.js";

const updateBody = z.object({
  action: z.enum(["dismiss", "defer"]),
  reason: z.string().min(1),
  comment: z.string().max(2000).optional(),
});

export async function violationRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user = await requireAuth(
        req.headers.authorization
      );
    } catch {
      return reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
    }
  });

  app.patch("/:violationId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { violationId } = req.params as { violationId: string };
    const body = updateBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });

    const violation = await prisma.ruleViolation.findFirst({
      where: { id: violationId },
      include: { run: { include: { plan: { include: { project: true } } } } },
    });
    if (!violation || violation.run.plan.project.userId !== user.id)
      return reply.status(404).send({ code: "NOT_FOUND", message: "Violation not found" });

    const { action, reason, comment } = body.data;
    if (action === "dismiss" && !DISMISS_REASON_VALUES.includes(reason))
      return reply.status(400).send({ code: "INVALID_REASON", message: "Invalid dismiss reason" });
    if (action === "defer" && !DEFER_REASON_VALUES.includes(reason))
      return reply.status(400).send({ code: "INVALID_REASON", message: "Invalid defer reason" });

    const toStatus = action === "dismiss" ? "dismissed" : "deferred";
    const fromStatus = violation.status;

    await prisma.$transaction([
      prisma.violationReview.create({
        data: {
          violationId,
          fromStatus,
          toStatus,
          reason,
          comment: comment ?? null,
          userId: user.id,
        },
      }),
      prisma.ruleViolation.update({
        where: { id: violationId },
        data: {
          status: toStatus,
          reason,
          comment: comment ?? null,
          decidedByUserId: user.id,
          decidedAt: new Date(),
        },
      }),
    ]);

    const updated = await prisma.ruleViolation.findUnique({
      where: { id: violationId },
      include: { decidedBy: { select: { id: true, email: true, name: true } } },
    });
    return {
      id: updated!.id,
      status: updated!.status,
      reason: updated!.reason,
      comment: updated!.comment,
      decidedAt: updated!.decidedAt?.toISOString(),
      decidedBy: updated!.decidedBy
        ? { id: updated!.decidedBy.id, email: updated!.decidedBy.email, name: updated!.decidedBy.name }
        : undefined,
    };
  });

  app.get("/:violationId/history", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { violationId } = req.params as { violationId: string };

    const violation = await prisma.ruleViolation.findFirst({
      where: { id: violationId },
      include: { run: { include: { plan: { include: { project: true } } } } },
    });
    if (!violation) return reply.status(404).send({ code: "NOT_FOUND", message: "Violation not found" });

    const isOwner = violation.run.plan.project.userId === user.id;
    if (!isOwner && !isAdmin(user.email))
      return reply.status(403).send({ code: "FORBIDDEN", message: "Access denied" });

    const history = await prisma.violationReview.findMany({
      where: { violationId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return {
      violationId,
      currentStatus: violation.status,
      history: history.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        reason: h.reason,
        comment: h.comment,
        createdAt: h.createdAt.toISOString(),
        user: { id: h.user.id, email: h.user.email, name: h.user.name },
      })),
    };
  });
}
