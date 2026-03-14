import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Project } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth } from "../auth.js";

const createBody = z.object({ name: z.string().min(1) });

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

  app.get("/", async (req) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { plans: true } } },
    });
    return projects.map((p: Project & { _count: { plans: number } }) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt.toISOString(),
      planCount: p._count.plans,
    }));
  });

  app.post("/", async (req, reply) => {
    const { user } = req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> };
    const body = createBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });
    const project = await prisma.project.create({
      data: { name: body.data.name, userId: user.id },
    });
    return reply.status(201).send({
      id: project.id,
      name: project.name,
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
      createdAt: project.createdAt.toISOString(),
      planCount: project._count.plans,
    };
  });
}
