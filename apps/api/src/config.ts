function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw || typeof raw !== "string") return [];
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

function getAnalysisCacheConfig() {
  const retentionDays = Number(process.env.BAUPILOT_ANALYSIS_CACHE_RETENTION_DAYS);
  const extendOnReuse = process.env.BAUPILOT_ANALYSIS_CACHE_EXTEND_ON_REUSE;
  const cleanupEnabled = process.env.BAUPILOT_ANALYSIS_CACHE_CLEANUP_ENABLED;
  const cleanupCron = process.env.BAUPILOT_ANALYSIS_CACHE_CLEANUP_CRON;
  return {
    retentionDays: Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 30,
    extendOnReuse: extendOnReuse !== "false",
    cleanupEnabled: cleanupEnabled !== "false",
    cleanupCron: cleanupCron || "0 3 * * *", // default: daily at 3am
  };
}

export const config = {
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  databaseUrl: process.env.DATABASE_URL!,
  getAdminEmails,
  /** Google Gemini API key for PDF analysis. When set, PDFs use Gemini instead of pdf-parse. */
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  analysisCache: getAnalysisCacheConfig(),
};
