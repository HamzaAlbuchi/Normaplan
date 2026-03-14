import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";
import { parseGermanZipCode } from "../plzToState.js";

const createBody = z.object({
  name: z.string().min(1),
  zipCode: z.string().length(5).regex(/^[0-9]{5}$/),
});
const updateBody = z.object({
  name: z.string().min(1).optional(),
  zipCode: z.string().length(5).regex(/^[0-9]{5}$/).optional(),
});

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
    const runs = await prisma.ruleRun.findMany({
      where: { plan: { project: { userId: user.id } } },
      select: { warningCount: true, errorCount: true },
    });
    const runCount = runs.length;
    const warningCount = runs.reduce((s, r) => s + r.warningCount, 0);
    const errorCount = runs.reduce((s, r) => s + r.errorCount, 0);
    return { runCount, warningCount, errorCount };
  });

  app.get("/", async (req) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { plans: true } } },
    });
    return projects.map((p: { id: string; name: string; zipCode: string; state: string; createdAt: Date; _count: { plans: number } }) => ({
      id: p.id,
      name: p.name,
      zipCode: p.zipCode,
      state: p.state,
      createdAt: p.createdAt.toISOString(),
      planCount: p._count.plans,
    }));
  });

  app.post("/", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const body = createBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });
    const zipCode = String(body.data.zipCode).trim();
    const state = parseGermanZipCode(zipCode);
    if (!state)
      return reply.status(400).send({ code: "INVALID_ZIP", message: "Ungültige deutsche Postleitzahl (5 Ziffern)." });
    const project = await prisma.project.create({
      data: { name: body.data.name, userId: user.id, zipCode, state },
    });
    return reply.status(201).send({
      id: project.id,
      name: project.name,
      zipCode: project.zipCode,
      state: project.state,
      createdAt: project.createdAt.toISOString(),
      planCount: 0,
    });
  });

  app.get("/:projectId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId } = req.params as { projectId: string };
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      include: { _count: { select: { plans: true } } },
    });
    if (!project) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });
    return {
      id: project.id,
      name: project.name,
      zipCode: project.zipCode,
      state: project.state,
      createdAt: project.createdAt.toISOString(),
      planCount: project._count.plans,
    };
  });

  app.patch("/:projectId", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const { projectId } = req.params as { projectId: string };
    const body = updateBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });
    if (!project) return reply.status(404).send({ code: "NOT_FOUND", message: "Project not found" });
    const zipCode = body.data.zipCode !== undefined
      ? String(body.data.zipCode).trim()
      : project.zipCode;
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
      createdAt: updated.createdAt.toISOString(),
      planCount: updated._count.plans,
    };
  });
}
