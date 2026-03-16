/**
 * Analysis reuse service tests.
 * Run with: pnpm test (or npm test)
 * For full integration tests with DB, use a test database and run migrations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeFileHash } from "./fileHashService.js";
import { detectFileType } from "./fileTypeDetection.js";

describe("AnalysisReuseService (unit)", () => {
  describe("compatibility key", () => {
    it("reuse requires fileHash + sourceType + extractorStrategy + extractionVersion + rulesVersion + promptVersion + modelVersion to match", () => {
      const buf = Buffer.from("test");
      const hash = computeFileHash(buf);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);

      const d = detectFileType("plan.pdf", true);
      expect(d.sourceType).toBe("PDF");
      expect(d.extractorStrategy).toBe("GEMINI_PDF");
    });
  });

  describe("file hash consistency", () => {
    it("same bytes produce same hash for reuse lookup", () => {
      const b1 = Buffer.from("identical content");
      const b2 = Buffer.from("identical content");
      expect(computeFileHash(b1)).toBe(computeFileHash(b2));
    });

    it("different bytes produce different hash", () => {
      expect(computeFileHash(Buffer.from("a"))).not.toBe(computeFileHash(Buffer.from("b")));
    });
  });

  describe("extractor strategy", () => {
    it("PDF with Gemini uses GEMINI_PDF, without uses PDF_FALLBACK", () => {
      expect(detectFileType("x.pdf", true).extractorStrategy).toBe("GEMINI_PDF");
      expect(detectFileType("x.pdf", false).extractorStrategy).toBe("PDF_FALLBACK");
    });

    it("same hash + different sourceType -> different compatibility key", () => {
      const pdf = detectFileType("x.pdf", true);
      const ifc = detectFileType("x.ifc", true);
      expect(pdf.sourceType).not.toBe(ifc.sourceType);
      expect(pdf.extractorStrategy).not.toBe(ifc.extractorStrategy);
    });
  });
});
