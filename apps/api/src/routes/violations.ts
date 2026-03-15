import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, isAdmin } from "../auth.js";
import { canReviewViolations, canAccessProject, listAccessibleProjectIds } from "../rbac.js";
import { DISMISS_REASON_VALUES, DEFER_REASON_VALUES } from "../constants/reviewReasons.js";

const listQuery = z.object({
  status: z.string().optional(),
  severity: z.enum(["info", "warning", "error", "critical"]).optional(),
  projectId: z.string().cuid().optional(),
  projectStatus: z.string().optional(), // comma-sep: ongoing, paused, ended. default ongoing
  ruleId: z.string().optional(),
  reviewedBy: z.string().cuid().optional(),
  sort: z.enum(["detectedAt", "updatedAt"]).optional().default("detectedAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

const updateBody = z.object({
  action: z.enum(["confirm", "dismiss", "defer", "resolve"]),
  reason: z.string().min(1).optional(),
  comment: z.string().max(2000).optional(),
});

function mapSeverity(s: string): string {
  return s === "error" ? "critical" : s;
}

function toViolationDto(v: {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  suggestion: string | null;
  elementIds: string[];
  actualValue: number | null;
  requiredValue: number | null;
  regulationRef: string | null;
  status: string;
  reason: string | null;
  comment: string | null;
  decidedAt: Date | null;
  updatedAt: Date;
  run: { id: string; checkedAt: Date; plan: { id: string; name: string; projectId: string; project: { id: string; name: string } } };
  decidedBy: { id: string; email: string; name: string | null } | null;
}) {
  return {
    id: v.id,
    title: v.ruleName,
    description: v.message,
    severity: mapSeverity(v.severity),
    status: v.status,
    projectId: v.run.plan.project.id,
    projectName: v.run.plan.project.name,
    planId: v.run.plan.id,
    planName: v.run.plan.name,
    runId: v.run.id,
    elementIds: v.elementIds,
    ruleId: v.ruleId,
    ruleName: v.ruleName,
    actualValue: v.actualValue,
    requiredValue: v.requiredValue,
    regulationRef: v.regulationRef,
    suggestion: v.suggestion,
    detectedAt: v.run.checkedAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    reviewedBy: v.decidedBy ? { id: v.decidedBy.id, email: v.decidedBy.email, name: v.decidedBy.name } : undefined,
    reviewedAt: v.decidedAt?.toISOString(),
    reason: v.reason,
    comment: v.comment,
  };
}

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

  app.get("/rule-types", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const projectIds = await listAccessibleProjectIds(user.id);
    if (projectIds.length === 0) return [];

    const rows = await prisma.ruleViolation.findMany({
      where: { run: { plan: { projectId: { in: projectIds } } } },
      select: { ruleId: true, ruleName: true },
      distinct: ["ruleId"],
      orderBy: { ruleName: "asc" },
    });
    return rows.map((r) => ({ id: r.ruleId, name: r.ruleName }));
  });

  app.get("/", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const query = listQuery.safeParse(req.query);
    if (!query.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: query.error.message });

    const projectIds = await listAccessibleProjectIds(user.id);
    if (projectIds.length === 0) return { items: [], total: 0 };

    const statuses = query.data.projectStatus
      ? query.data.projectStatus.split(",").map((s) => s.trim()).filter(Boolean)
      : ["ongoing"];

    const runWhere: Record<string, unknown> = query.data.projectId
      ? { plan: { projectId: query.data.projectId } }
      : { plan: { project: { id: { in: projectIds }, status: { in: statuses } } } };

    if (query.data.projectId && !projectIds.includes(query.data.projectId)) {
      return { items: [], total: 0 };
    }

    const where: Record<string, unknown> = { run: runWhere };
    if (query.data.status) where.status = query.data.status;
    if (query.data.severity) {
      where.severity = query.data.severity === "critical" ? "error" : query.data.severity;
    }
    if (query.data.ruleId) where.ruleId = query.data.ruleId;
    if (query.data.reviewedBy) where.decidedByUserId = query.data.reviewedBy;

    const [items, total] = await Promise.all([
      prisma.ruleViolation.findMany({
        where,
        orderBy: query.data.sort === "updatedAt"
          ? { updatedAt: query.data.order }
          : { run: { checkedAt: query.data.order } },
        take: query.data.limit,
        skip: query.data.offset,
        include: {
          run: { include: { plan: { include: { project: true } } } },
          decidedBy: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.ruleViolation.count({ where }),
    ]);

    return { items: items.map(toViolationDto), total };
  });

  app.get("/:violationId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { violationId } = req.params as { violationId: string };

    const violation = await prisma.ruleViolation.findFirst({
      where: { id: violationId },
      include: {
        run: { include: { plan: { include: { project: true } } } },
        decidedBy: { select: { id: true, email: true, name: true } },
      },
    });
    if (!violation) return reply.status(404).send({ code: "NOT_FOUND", message: "Violation not found" });

    const access = await canAccessProject(user.id, violation.run.plan.projectId);
    if (!access.ok && !isAdmin(user.email))
      return reply.status(403).send({ code: "FORBIDDEN", message: "Access denied" });

    return toViolationDto(violation);
  });

  app.patch("/:violationId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { violationId } = req.params as { violationId: string };
    const body = updateBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });

    const violation = await prisma.ruleViolation.findFirst({
      where: { id: violationId },
      include: { run: { include: { plan: true } } },
    });
    if (!violation || !(await canReviewViolations(user.id, violation.run.plan.projectId)))
      return reply.status(404).send({ code: "NOT_FOUND", message: "Violation not found" });

    const { action, reason, comment } = body.data;
    let toStatus: string;
    let needsReason = false;

    switch (action) {
      case "confirm":
        toStatus = "confirmed";
        break;
      case "resolve":
        toStatus = "resolved";
        break;
      case "dismiss":
        toStatus = "dismissed";
        needsReason = true;
        if (!reason || !(DISMISS_REASON_VALUES as readonly string[]).includes(reason))
          return reply.status(400).send({ code: "INVALID_REASON", message: "Valid dismiss reason required" });
        break;
      case "defer":
        toStatus = "deferred";
        needsReason = true;
        if (!reason || !(DEFER_REASON_VALUES as readonly string[]).includes(reason))
          return reply.status(400).send({ code: "INVALID_REASON", message: "Valid defer reason required" });
        break;
      default:
        return reply.status(400).send({ code: "INVALID_ACTION", message: "Invalid action" });
    }

    const fromStatus = violation.status;

    await prisma.$transaction([
      prisma.violationReview.create({
        data: {
          violationId,
          fromStatus,
          toStatus,
          reason: reason ?? null,
          comment: comment ?? null,
          userId: user.id,
        },
      }),
      prisma.ruleViolation.update({
        where: { id: violationId },
        data: {
          status: toStatus,
          reason: needsReason ? reason! : violation.reason,
          comment: comment ?? violation.comment,
          decidedByUserId: user.id,
          decidedAt: new Date(),
        },
      }),
    ]);

    const updated = await prisma.ruleViolation.findUnique({
      where: { id: violationId },
      include: {
        run: { include: { plan: { include: { project: true } } } },
        decidedBy: { select: { id: true, email: true, name: true } },
      },
    });
    return toViolationDto(updated!);
  });

  app.get("/:violationId/history", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { violationId } = req.params as { violationId: string };

    const violation = await prisma.ruleViolation.findFirst({
      where: { id: violationId },
      include: { run: { include: { plan: true } } },
    });
    if (!violation) return reply.status(404).send({ code: "NOT_FOUND", message: "Violation not found" });

    const access = await canAccessProject(user.id, violation.run.plan.projectId);
    if (!access.ok && !isAdmin(user.email))
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
