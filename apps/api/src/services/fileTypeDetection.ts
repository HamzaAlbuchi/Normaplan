/**
 * File type detection – determines source type and extractor strategy
 * for analysis reuse compatibility.
 */

import path from "node:path";

/** Normalized source types for uploads */
export type SourceType = "PDF" | "IFC" | "DWG" | "IMAGE" | "JSON" | "UNKNOWN";

/** Extractor strategy used for this file type */
export type ExtractorStrategy =
  | "GEMINI_PDF"
  | "PDF_FALLBACK"
  | "IFC_NATIVE"
  | "JSON_MOCK"
  | "DWG_AI"
  | "IMAGE_VISION"
  | "UNKNOWN";

const EXT_TO_SOURCE: Record<string, SourceType> = {
  ".pdf": "PDF",
  ".ifc": "IFC",
  ".dwg": "DWG",
  ".dxf": "DWG",
  ".png": "IMAGE",
  ".jpg": "IMAGE",
  ".jpeg": "IMAGE",
  ".webp": "IMAGE",
  ".json": "JSON",
};

const MIME_TO_SOURCE: Record<string, SourceType> = {
  "application/pdf": "PDF",
  "image/png": "IMAGE",
  "image/jpeg": "IMAGE",
  "image/webp": "IMAGE",
  "application/json": "JSON",
};

export interface DetectedFileType {
  sourceType: SourceType;
  extractorStrategy: ExtractorStrategy;
  fileExtension: string;
  mimeType?: string;
}

/**
 * Detect source type and extractor strategy from filename and optional mime.
 * For PDF: uses GEMINI_PDF when Gemini is available, else PDF_FALLBACK.
 * Caller should pass useGemini based on config.
 */
export function detectFileType(
  filename: string,
  useGemini: boolean,
  mimeType?: string
): DetectedFileType {
  const ext = path.extname(filename).toLowerCase();
  let sourceType: SourceType = EXT_TO_SOURCE[ext] ?? "UNKNOWN";
  if (mimeType && MIME_TO_SOURCE[mimeType]) {
    sourceType = MIME_TO_SOURCE[mimeType];
  }

  let extractorStrategy: ExtractorStrategy = "UNKNOWN";
  switch (sourceType) {
    case "PDF":
      extractorStrategy = useGemini ? "GEMINI_PDF" : "PDF_FALLBACK";
      break;
    case "IFC":
      extractorStrategy = "IFC_NATIVE";
      break;
    case "DWG":
      extractorStrategy = "DWG_AI";
      break;
    case "IMAGE":
      extractorStrategy = "IMAGE_VISION";
      break;
    case "JSON":
      extractorStrategy = "JSON_MOCK";
      break;
    default:
      extractorStrategy = "UNKNOWN";
  }

  return {
    sourceType,
    extractorStrategy,
    fileExtension: ext,
    mimeType,
  };
}
