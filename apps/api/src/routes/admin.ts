import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { requireAdmin } from "../auth.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    try {
      (req as unknown as { user: Awaited<ReturnType<typeof requireAdmin>> }).user = await requireAdmin(
        req.headers.authorization
      );
    } catch {
      return reply.status(403).send({ code: "FORBIDDEN", message: "Admin access required" });
    }
  });

  app.get("/stats", async () => {
    const [userCount, projectCount, runs] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.ruleRun.findMany({ select: { warningCount: true, errorCount: true } }),
    ]);
    const runCount = runs.length;
    const warningCount = runs.reduce((s, r) => s + r.warningCount, 0);
    const errorCount = runs.reduce((s, r) => s + r.errorCount, 0);
    const violationCount = warningCount + errorCount;
    return {
      userCount,
      projectCount,
      runCount,
      violationCount,
      warningCount,
      errorCount,
    };
  });

  app.get("/users", async () => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                projects: {
                  include: {
                    _count: { select: { plans: true } },
                    plans: {
                      include: {
                        runs: {
                          select: {
                            id: true,
                            checkedAt: true,
                            violationCount: true,
                            warningCount: true,
                            errorCount: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return users.map((u) => {
      const projects = u.memberships.flatMap((m) => m.organization.projects);
      const totalPlans = projects.reduce((s, p) => s + p._count.plans, 0);
      const totalRuns = projects.reduce((s, p) => s + p.plans.reduce((sp, pl) => sp + pl.runs.length, 0), 0);
      const totalViolations = projects.reduce((s, p) => {
        return s + p.plans.reduce((sp, pl) => {
          return sp + pl.runs.reduce((sr, r) => sr + r.violationCount, 0);
        }, 0);
      }, 0);

      return {
        id: u.id,
        email: u.email,
        name: u.name ?? undefined,
        createdAt: u.createdAt.toISOString(),
        projectCount: projects.length,
        planCount: totalPlans,
        runCount: totalRuns,
        violationCount: totalViolations,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          state: p.state,
          planCount: p._count.plans,
          runs: p.plans.flatMap((pl) =>
            pl.runs.map((r) => ({
              id: r.id,
              planId: pl.id,
              planName: pl.name,
              checkedAt: r.checkedAt.toISOString(),
              violationCount: r.violationCount,
              warningCount: r.warningCount,
              errorCount: r.errorCount,
            }))
          ),
        })),
      };
    });
  });
}
