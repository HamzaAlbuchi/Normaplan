/**
 * Analysis reuse service – looks up reusable AnalysisArtifact by file hash
 * and pipeline compatibility. Reuses when all compatibility fields match.
 */

import { prisma } from "../db.js";
import { config } from "../config.js";
import { computeFileHash } from "./fileHashService.js";
import {
  detectFileType,
  type DetectedFileType,
  type ExtractorStrategy,
  type SourceType,
} from "./fileTypeDetection.js";
import {
  EXTRACTION_VERSION,
  getRulesVersion,
  PROMPT_VERSION,
  MODEL_VERSION,
} from "./pipelineVersions.js";
export interface ReuseLookupParams {
  buffer: Buffer;
  filename: string;
  useGemini: boolean;
  mimeType?: string;
}

export interface ReuseResult {
  reused: boolean;
  artifactId: string | null;
  normalizedPlanJson: string;
  fileHash: string;
  sourceType: SourceType;
  extractorStrategy: ExtractorStrategy;
  reuseCount: number;
  artifactExpiresAt: string | null;
  reuseReason?: string;
}

/**
 * For PDF, both GEMINI_PDF and PDF_FALLBACK can produce the same file.
 * We try both lookups; first match wins.
 */
function getStrategiesToTry(sourceType: SourceType, useGemini: boolean): ExtractorStrategy[] {
  if (sourceType === "PDF") {
    return useGemini ? ["GEMINI_PDF", "PDF_FALLBACK"] : ["PDF_FALLBACK"];
  }
  if (sourceType === "IFC") return ["IFC_NATIVE"];
  if (sourceType === "JSON") return ["JSON_MOCK"];
  if (sourceType === "DWG") return ["DWG_AI"];
  if (sourceType === "IMAGE") return ["IMAGE_VISION"];
  return ["UNKNOWN"];
}

/**
 * Look up a reusable AnalysisArtifact. Tries multiple strategies for PDF.
 * If found and compatible, return it.
 * If not found, return null (caller runs extraction and then calls saveNewArtifact).
 */
export async function findReusableArtifact(
  params: ReuseLookupParams
): Promise<{ artifact: { id: string; normalizedPlanJson: string; reuseCount: number; expiresAt: Date }; detected: DetectedFileType } | null> {
  const { buffer, filename, useGemini, mimeType } = params;
  const fileHash = computeFileHash(buffer);
  const detected = detectFileType(filename, useGemini, mimeType);
  const strategies = getStrategiesToTry(detected.sourceType, useGemini);

  const rulesVersion = getRulesVersion();

  for (const extractorStrategy of strategies) {
    const artifact = await prisma.analysisArtifact.findUnique({
      where: {
        fileHash_sourceType_extractorStrategy_extractionVersion_rulesVersion_promptVersion_modelVersion: {
          fileHash,
          sourceType: detected.sourceType,
          extractorStrategy,
          extractionVersion: EXTRACTION_VERSION,
          rulesVersion,
          promptVersion: PROMPT_VERSION,
          modelVersion: MODEL_VERSION,
        },
      },
    });

    if (artifact) {
      const cacheConfig = config.analysisCache;
      const now = new Date();
      let expiresAt = artifact.expiresAt;
      let reuseCount = artifact.reuseCount;

      if (cacheConfig.extendOnReuse) {
        expiresAt = new Date(now.getTime() + cacheConfig.retentionDays * 24 * 60 * 60 * 1000);
        await prisma.analysisArtifact.update({
          where: { id: artifact.id },
          data: { lastUsedAt: now, reuseCount: artifact.reuseCount + 1, expiresAt },
        });
        reuseCount = artifact.reuseCount + 1;
      } else {
        await prisma.analysisArtifact.update({
          where: { id: artifact.id },
          data: { lastUsedAt: now, reuseCount: artifact.reuseCount + 1 },
        });
        reuseCount = artifact.reuseCount + 1;
      }

      return {
        artifact: {
          id: artifact.id,
          normalizedPlanJson: artifact.normalizedPlanJson,
          reuseCount,
          expiresAt,
        },
        detected: { ...detected, extractorStrategy },
      };
    }
  }

  const anyWithHash = await prisma.analysisArtifact.findFirst({
    where: { fileHash },
    select: { id: true },
  });
  if (anyWithHash) {
    console.warn(
      `[AnalysisReuse] Matching file hash found but pipeline compatibility did not match (fileHash=${fileHash.slice(0, 16)}..., sourceType=${detected.sourceType}, strategies tried: ${strategies.join(", ")})`
    );
  }
  return null;
}

/**
 * Save a new AnalysisArtifact after fresh extraction.
 * Pass actualExtractorStrategy when it differs from default (e.g. PDF_FALLBACK when Gemini failed).
 */
export async function saveNewArtifact(params: {
  buffer: Buffer;
  filename: string;
  useGemini: boolean;
  mimeType?: string;
  normalizedPlanJson: string;
  actualExtractorStrategy?: ExtractorStrategy;
}): Promise<{ artifactId: string; expiresAt: Date; detected: DetectedFileType }> {
  const { buffer, filename, useGemini, mimeType, normalizedPlanJson, actualExtractorStrategy } = params;
  const fileHash = computeFileHash(buffer);
  const detected = detectFileType(filename, useGemini, mimeType);
  const extractorStrategy = actualExtractorStrategy ?? detected.extractorStrategy;
  const rulesVersion = getRulesVersion();

  const retentionDays = config.analysisCache.retentionDays;
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

  const artifact = await prisma.analysisArtifact.create({
    data: {
      fileHash,
      sourceType: detected.sourceType,
      extractorStrategy,
      extractionVersion: EXTRACTION_VERSION,
      rulesVersion,
      promptVersion: PROMPT_VERSION,
      modelVersion: MODEL_VERSION,
      originalFilename: filename,
      mimeType: mimeType ?? null,
      fileSize: buffer.length,
      normalizedPlanJson,
      deterministicFindingsJson: null,
      aiFindingsJson: null,
      reuseCount: 1,
      expiresAt,
      isPinned: false,
    },
  });

  return {
    artifactId: artifact.id,
    expiresAt,
    detected: { ...detected, extractorStrategy },
  };
}
