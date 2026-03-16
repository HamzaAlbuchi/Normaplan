function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw || typeof raw !== "string") return [];
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export const config = {
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  databaseUrl: process.env.DATABASE_URL!,
  getAdminEmails,
  /** Google Gemini API key for PDF analysis. When set, PDFs use Gemini instead of pdf-parse. */
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};
