import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { planRoutes } from "./routes/plans.js";
import { runRoutes } from "./routes/runs.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB

app.get("/health", async () => ({ status: "ok", service: "baupilot-api" }));

await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(projectRoutes, { prefix: "/api/projects" });
await app.register(planRoutes, { prefix: "/api/plans" });
await app.register(runRoutes, { prefix: "/api/runs" });

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: "0.0.0.0" });
console.log(`BauPilot API listening on http://localhost:${port}`);
