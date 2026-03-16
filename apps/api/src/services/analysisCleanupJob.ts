/**
 * Scheduled cleanup job – deletes expired AnalysisArtifacts that are not pinned.
 * Does NOT delete Plans; Plan.analysisArtifactId becomes null (SetNull) when artifact is deleted.
 */

import { prisma } from "../db.js";
import { config } from "../config.js";

export async function runAnalysisCleanup(): Promise<{ deleted: number }> {
  const cacheConfig = config.analysisCache;
  if (!cacheConfig.cleanupEnabled) {
    return { deleted: 0 };
  }

  const now = new Date();
  const expired = await prisma.analysisArtifact.findMany({
    where: {
      expiresAt: { lt: now },
      isPinned: false,
    },
    select: { id: true },
  });

  if (expired.length === 0) {
    return { deleted: 0 };
  }

  const ids = expired.map((a) => a.id);
  const result = await prisma.analysisArtifact.deleteMany({
    where: { id: { in: ids } },
  });

  return { deleted: result.count };
}
