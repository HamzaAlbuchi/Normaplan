import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth.js";
import { getRulesMetadata } from "../rules/declarativeRunner.js";

export async function rulesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      (req as unknown as { user: Awaited<ReturnType<typeof requireAuth>> }).user =
        await requireAuth(req.headers.authorization);
    } catch {
      return reply.status(401).send({ message: "Unauthorized" });
    }
  });

  app.get("/", async () => {
    return getRulesMetadata();
  });
}
