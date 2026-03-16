-- CreateTable
CREATE TABLE "AnalysisArtifact" (
    "id" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "extractorStrategy" TEXT NOT NULL,
    "extractionVersion" TEXT NOT NULL,
    "rulesVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "normalizedPlanJson" TEXT NOT NULL,
    "deterministicFindingsJson" TEXT,
    "aiFindingsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reuseCount" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnalysisArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisArtifact_fileHash_sourceType_extractorStrategy_extractionVersion_rulesVersion_promptVersion_modelVersion_key" ON "AnalysisArtifact"("fileHash", "sourceType", "extractorStrategy", "extractionVersion", "rulesVersion", "promptVersion", "modelVersion");

-- CreateIndex
CREATE INDEX "AnalysisArtifact_fileHash_idx" ON "AnalysisArtifact"("fileHash");

-- CreateIndex
CREATE INDEX "AnalysisArtifact_expiresAt_idx" ON "AnalysisArtifact"("expiresAt");

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "analysisArtifactId" TEXT;

-- CreateIndex
CREATE INDEX "Plan_analysisArtifactId_idx" ON "Plan"("analysisArtifactId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_analysisArtifactId_fkey" FOREIGN KEY ("analysisArtifactId") REFERENCES "AnalysisArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
