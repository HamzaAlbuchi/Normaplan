import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db.js";
import { config } from "./config.js";

const { getAdminEmails } = config;

const secret = new TextEncoder().encode(config.jwtSecret);

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    const email = payload.email as string;
    if (!sub || !email) return null;
    return { userId: sub, email };
  } catch {
    return null;
  }
}

export async function requireAuth(authHeader: string | undefined) {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Unauthorized");
  const payload = await verifyToken(token);
  if (!payload) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new Error("Unauthorized");
  return user;
}

export function isAdmin(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}

export async function requireAdmin(authHeader: string | undefined) {
  const user = await requireAuth(authHeader);
  if (!isAdmin(user.email)) throw new Error("Forbidden");
  return user;
}
