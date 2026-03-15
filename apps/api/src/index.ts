import fs from "node:fs/promises";
import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { authRoutes } from "./routes/auth.js";
import { organizationRoutes } from "./routes/organizations.js";
import { membershipRoutes } from "./routes/memberships.js";
import { projectRoutes } from "./routes/projects.js";
import { planRoutes } from "./routes/plans.js";
import { runRoutes } from "./routes/runs.js";
import { adminRoutes } from "./routes/admin.js";
import { violationRoutes } from "./routes/violations.js";
import { rulesRoutes } from "./routes/rules.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

async function start() {
  if (!process.env.DATABASE_URL) {
    console.error("FATAL: DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const app = Fastify({ logger: true });

  const corsOrigin = process.env.CORS_ORIGIN;
  await app.register(cors, {
    origin: corsOrigin ? corsOrigin.split(",").map((o: string) => o.trim()) : true,
  });
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
    attachFieldsToBody: "keyValues",
  });

  app.get("/health", async () => ({ status: "ok", service: "baupilot-api" }));

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(organizationRoutes, { prefix: "/api/organizations" });
  await app.register(membershipRoutes, { prefix: "/api/memberships" });
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(planRoutes, { prefix: "/api/plans" });
  await app.register(runRoutes, { prefix: "/api/runs" });
  await app.register(adminRoutes, { prefix: "/api/admin" });
  await app.register(violationRoutes, { prefix: "/api/violations" });
  await app.register(rulesRoutes, { prefix: "/api/rules" });

  await fs.mkdir(config.uploadDir, { recursive: true }).catch(() => {});

  try {
    await prisma.$connect();
  } catch (err) {
    console.error("FATAL: Could not connect to database:", err);
    process.exit(1);
  }

  const port = Number(process.env.PORT) || 3001;
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`BauPilot API listening on port ${port}`);
}

start().catch((err) => {
  console.error("FATAL: Server failed to start:", err);
  process.exit(1);
});
