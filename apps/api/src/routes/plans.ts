import { FastifyInstance } from "fastify";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { config } from "../config.js";
import { parsePlanFromJson } from "../parser/mockParser.js";

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
    const data = await req.file();
    if (!data) return reply.status(400).send({ code: "MISSING_FILE", message: "No file uploaded" });

    const projectId = (data.fields.projectId as unknown as { value: string })?.value;
    const name = (data.fields.name as unknown as { value: string })?.value || data.filename;
    if (!projectId) return reply.status(400).send({ code: "MISSING_PROJECT_ID", message: "projectId required" });

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
    if (!project) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });

    const ext = path.extname(data.filename).toLowerCase();
    const buf = await data.toBuffer();

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
    } else {
      // PDF or other: store file, mark as uploaded; extraction not implemented in MVP
      status = "uploaded";
      extractionError = "Plan extraction from PDF not implemented in MVP. Upload a JSON plan file for testing.";
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
        name: name || data.filename,
        fileName: data.filename,
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
    if (!plan || plan.project.userId !== user.id)
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

  app.get("/project/:projectId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId } = req.params as { projectId: string };
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
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
