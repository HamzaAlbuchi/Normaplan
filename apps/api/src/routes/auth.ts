import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword, createToken } from "../auth.js";

const registerBody = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().optional() });
const loginBody = z.object({ email: z.string().email(), password: z.string() });

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const body = registerBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });
    const existing = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (existing) return reply.status(409).send({ code: "EMAIL_EXISTS", message: "Email already registered" });
    const passwordHash = await hashPassword(body.data.password);
    const user = await prisma.user.create({
      data: { email: body.data.email, passwordHash, name: body.data.name },
    });
    const token = await createToken(user.id, user.email);
    return reply.send({ token, user: { id: user.id, email: user.email, name: user.name } });
  });

  app.post("/login", async (req, reply) => {
    const body = loginBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ code: "VALIDATION_ERROR", message: body.error.message });
    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user || !(await verifyPassword(user.passwordHash, body.data.password)))
      return reply.status(401).send({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    const token = await createToken(user.id, user.email);
    return reply.send({ token, user: { id: user.id, email: user.email, name: user.name } });
  });
}
