import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { canWorkOnProject } from "../rbac.js";
import { nanoid } from "nanoid";
import { runRules } from "../rules/index.js";
import type { PlanElements, RuleViolation } from "../types.js";

export async function runRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user = await requireAuth(
        req.headers.authorization
      );
    } catch {
      return reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
    }
  });

  app.post("/", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const body = req.body as { planId: string };
    if (!body?.planId) return reply.status(400).send({ code: "MISSING_PLAN_ID", message: "planId required" });

    const plan = await prisma.plan.findFirst({
      where: { id: body.planId },
      include: { project: true },
    });
    if (!plan || plan.project.userId !== user.id)
      return reply.status(404).send({ code: "NOT_FOUND", message: "Plan not found" });
    if (!plan.project.zipCode || !plan.project.state)
      return reply.status(400).send({ code: "MISSING_PROJECT_LOCATION", message: "Projekt muss eine Postleitzahl (PLZ) haben, um Prüfungen auszuführen." });
    if (!plan.elementsJson)
      return reply.status(400).send({ code: "PLAN_NOT_READY", message: "Plan extraction not ready. Upload a JSON, PDF, or IFC plan." });

    const elements = JSON.parse(plan.elementsJson) as PlanElements;
    const runId = nanoid();
    const { violations, ruleVersion } = runRules(elements, {
      runId,
      planId: plan.id,
      state: plan.project.state,
    });

    const warningCount = violations.filter((v: RuleViolation) => v.severity === "warning").length;
    const errorCount = violations.filter((v: RuleViolation) => v.severity === "error").length;

    const run = await prisma.ruleRun.create({
      data: {
        id: runId,
        planId: plan.id,
        ruleVersion,
        violationCount: violations.length,
        warningCount,
        errorCount,
      },
    });

    await prisma.ruleViolation.createMany({
      data: violations.map((v: RuleViolation) => ({
        runId: run.id,
        ruleId: v.ruleId,
        ruleName: v.ruleName,
        severity: v.severity,
        message: v.message,
        suggestion: v.suggestion ?? null,
        elementIds: v.elementIds,
        actualValue: v.actualValue ?? null,
        requiredValue: v.requiredValue ?? null,
        regulationRef: v.regulationRef ?? null,
      })),
    });

    const withViolations = await prisma.ruleRun.findUnique({
      where: { id: run.id },
      include: { violations: true },
    });

    return reply.status(201).send({
      id: withViolations!.id,
      planId: withViolations!.planId,
      checkedAt: withViolations!.checkedAt.toISOString(),
      violationCount: withViolations!.violationCount,
      warningCount: withViolations!.warningCount,
      errorCount: withViolations!.errorCount,
      violations: withViolations!.violations.map((v: { id: string; ruleId: string; ruleName: string; severity: string; message: string; suggestion: string | null; elementIds: string[]; actualValue: number | null; requiredValue: number | null; regulationRef: string | null; status: string; reason: string | null; comment: string | null; decidedAt: Date | null }) => ({
        id: v.id,
        ruleId: v.ruleId,
        ruleName: v.ruleName,
        severity: v.severity,
        message: v.message,
        suggestion: v.suggestion,
        elementIds: v.elementIds,
        actualValue: v.actualValue,
        requiredValue: v.requiredValue,
        regulationRef: v.regulationRef,
        status: v.status,
        reason: v.reason,
        comment: v.comment,
        decidedAt: v.decidedAt?.toISOString(),
      })),
    });
  });

  app.get("/:runId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { runId } = req.params as { runId: string };
    const run = await prisma.ruleRun.findFirst({
      where: { id: runId },
      include: { plan: { include: { project: true } }, violations: true },
    });
    if (!run || !(await canWorkOnProject(user.id, run.plan.projectId)))
      return reply.status(404).send({ code: "NOT_FOUND", message: "Run not found" });

    return {
      id: run.id,
      planId: run.planId,
      checkedAt: run.checkedAt.toISOString(),
      violationCount: run.violationCount,
      warningCount: run.warningCount,
      errorCount: run.errorCount,
      violations: run.violations.map((v: { id: string; ruleId: string; ruleName: string; severity: string; message: string; suggestion: string | null; elementIds: string[]; actualValue: number | null; requiredValue: number | null; regulationRef: string | null; status: string; reason: string | null; comment: string | null; decidedAt: Date | null }) => ({
        id: v.id,
        ruleId: v.ruleId,
        ruleName: v.ruleName,
        severity: v.severity,
        message: v.message,
        suggestion: v.suggestion,
        elementIds: v.elementIds,
        actualValue: v.actualValue,
        requiredValue: v.requiredValue,
        regulationRef: v.regulationRef,
        status: v.status,
        reason: v.reason,
        comment: v.comment,
        decidedAt: v.decidedAt?.toISOString(),
      })),
    };
  });
}
