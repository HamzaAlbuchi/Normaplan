import { FastifyInstance } from "fastify";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { canWorkOnProject, listAccessibleProjectIds } from "../rbac.js";
import { config } from "../config.js";
import { parsePlanFromJson } from "../parser/mockParser.js";
import { parsePlanFromPdf } from "../parser/pdfParser.js";
import { parsePlanFromIfc } from "../parser/ifcParser.js";

const createBody = z.object({ projectId: z.string().cuid(), name: z.string().min(1) });

export async function planRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user = await requireAuth(
        req.headers.authorization
      );
    } catch {
      return reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid or missing token" });
    }
  });

  app.post("/upload", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const rawBody: unknown = req.body;
    const body = (rawBody instanceof Promise ? await rawBody : rawBody) as Record<string, unknown> | undefined;
    const projectId = typeof body?.projectId === "string" ? body.projectId : undefined;
    const name = typeof body?.name === "string" ? body.name : undefined;
    const fileField = body?.file as { toBuffer?: () => Promise<Buffer>; _buf?: Buffer; filename?: string } | undefined;

    let buf: Buffer | undefined;
    let filename = "";
    if (fileField) {
      buf = fileField._buf ?? (typeof fileField.toBuffer === "function" ? await fileField.toBuffer() : undefined);
      filename = fileField.filename ?? "";
    }

    if (!buf || !filename) return reply.status(400).send({ code: "MISSING_FILE", message: "No file uploaded" });
    if (!projectId) return reply.status(400).send({ code: "MISSING_PROJECT_ID", message: "projectId required" });

    if (!(await canWorkOnProject(user.id, projectId)))
      return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });

    const ext = path.extname(filename).toLowerCase();

    let elementsJson: string | null = null;
    let status = "ready" as "uploaded" | "extracting" | "ready" | "failed";
    let extractionError: string | null = null;

    if (ext === ".json") {
      try {
        const elements = parsePlanFromJson(buf.toString("utf-8"));
        elementsJson = JSON.stringify(elements);
      } catch (e) {
        status = "failed";
        extractionError = e instanceof Error ? e.message : "Invalid JSON";
      }
    } else if (ext === ".pdf") {
      try {
        const elements = await parsePlanFromPdf(buf);
        elementsJson = JSON.stringify(elements);
        status = "ready";
      } catch (e) {
        status = "failed";
        extractionError = e instanceof Error ? e.message : "PDF extraction failed";
      }
    } else if (ext === ".ifc") {
      try {
        const elements = await parsePlanFromIfc(buf);
        elementsJson = JSON.stringify(elements);
        status = "ready";
      } catch (e) {
        status = "failed";
        extractionError = e instanceof Error ? e.message : "IFC/BIM extraction failed";
      }
    } else {
      status = "uploaded";
      extractionError = "Unsupported file type. Use .json, .pdf, or .ifc (BIM).";
    }

    const uploadDir = path.join(config.uploadDir, projectId);
    await fs.mkdir(uploadDir, { recursive: true });
    const fileId = nanoid();
    const fileName = `${fileId}${ext}`;
    const filePath = path.join(projectId, fileName);
    await fs.writeFile(path.join(config.uploadDir, filePath), buf);

    const plan = await prisma.plan.create({
      data: {
        projectId,
        name: name || filename,
        fileName: filename,
        filePath,
        status,
        extractionError,
        elementsJson,
      },
    });

    return reply.status(201).send({
      id: plan.id,
      projectId: plan.projectId,
      name: plan.name,
      fileName: plan.fileName,
      status: plan.status,
      createdAt: plan.createdAt.toISOString(),
      extractionError: plan.extractionError ?? undefined,
    });
  });

  app.get("/:planId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { planId } = req.params as { planId: string };
    const plan = await prisma.plan.findFirst({
      where: { id: planId },
      include: { project: true },
    });
    if (!plan || !(await listAccessibleProjectIds(user.id)).includes(plan.projectId))
      return reply.status(404).send({ code: "NOT_FOUND", message: "Plan not found" });

    const lastRun = await prisma.ruleRun.findFirst({
      where: { planId: plan.id },
      orderBy: { checkedAt: "desc" },
    });

    const response: Record<string, unknown> = {
      id: plan.id,
      projectId: plan.projectId,
      name: plan.name,
      fileName: plan.fileName,
      status: plan.status,
      createdAt: plan.createdAt.toISOString(),
      lastRunId: lastRun?.id,
      extractionError: plan.extractionError ?? undefined,
    };
    if (plan.elementsJson) response.elements = JSON.parse(plan.elementsJson);
    return response;
  });

  app.delete("/:planId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { planId } = req.params as { planId: string };
    const plan = await prisma.plan.findFirst({
      where: { id: planId },
      include: { project: true },
    });
    if (!plan || !(await canWorkOnProject(user.id, plan.projectId)))
      return reply.status(404).send({ code: "NOT_FOUND", message: "Plan not found" });
    if (plan.filePath) {
      const fullPath = path.join(config.uploadDir, plan.filePath);
      await fs.unlink(fullPath).catch(() => {});
    }
    await prisma.plan.delete({ where: { id: planId } });
    return reply.status(204).send();
  });

  app.get("/project/:projectId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId } = req.params as { projectId: string };
    const projectIds = await listAccessibleProjectIds(user.id);
    if (!projectIds.includes(projectId)) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });
    const plans = await prisma.plan.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    const lastRuns = await prisma.ruleRun.findMany({
      where: { planId: { in: plans.map((p: { id: string }) => p.id) } },
      distinct: ["planId"],
      orderBy: { checkedAt: "desc" },
    });
    const runByPlan = Object.fromEntries(lastRuns.map((r: { planId: string; id: string }) => [r.planId, r]));

    return plans.map((p: { id: string; projectId: string; name: string; fileName: string; status: string; createdAt: Date }) => ({
      id: p.id,
      projectId: p.projectId,
      name: p.name,
      fileName: p.fileName,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      lastRunId: runByPlan[p.id]?.id,
    }));
  });
}
