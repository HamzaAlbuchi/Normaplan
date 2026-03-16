/**
 * Schedules the analysis cleanup job. Uses setInterval for a simple daily run.
 * For cron expressions, add node-cron and use config.analysisCache.cleanupCron.
 */

import { runAnalysisCleanup } from "./analysisCleanupJob.js";
import { config } from "../config.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function scheduleAnalysisCleanup(): void {
  const cacheConfig = config.analysisCache;
  if (!cacheConfig.cleanupEnabled) return;

  const run = async () => {
    try {
      const { deleted } = await runAnalysisCleanup();
      if (deleted > 0) {
        console.log(`[AnalysisCleanup] Deleted ${deleted} expired analysis artifact(s)`);
      }
    } catch (err) {
      console.error("[AnalysisCleanup] Error:", err);
    }
  };

  setTimeout(run, 60_000); // run 1 min after startup
  setInterval(run, MS_PER_DAY);
}
