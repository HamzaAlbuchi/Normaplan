import { describe, it, expect } from "vitest";
import { detectFileType } from "./fileTypeDetection.js";

describe("FileTypeDetection", () => {
  it("PDF with Gemini -> GEMINI_PDF", () => {
    const d = detectFileType("plan.pdf", true);
    expect(d.sourceType).toBe("PDF");
    expect(d.extractorStrategy).toBe("GEMINI_PDF");
  });

  it("PDF without Gemini -> PDF_FALLBACK", () => {
    const d = detectFileType("plan.pdf", false);
    expect(d.sourceType).toBe("PDF");
    expect(d.extractorStrategy).toBe("PDF_FALLBACK");
  });

  it("IFC -> IFC_NATIVE", () => {
    const d = detectFileType("model.ifc", true);
    expect(d.sourceType).toBe("IFC");
    expect(d.extractorStrategy).toBe("IFC_NATIVE");
  });

  it("JSON -> JSON_MOCK", () => {
    const d = detectFileType("data.json", true);
    expect(d.sourceType).toBe("JSON");
    expect(d.extractorStrategy).toBe("JSON_MOCK");
  });

  it("DWG -> DWG_AI", () => {
    const d = detectFileType("drawing.dwg", true);
    expect(d.sourceType).toBe("DWG");
    expect(d.extractorStrategy).toBe("DWG_AI");
  });

  it("IMAGE -> IMAGE_VISION", () => {
    const d = detectFileType("plan.png", true);
    expect(d.sourceType).toBe("IMAGE");
    expect(d.extractorStrategy).toBe("IMAGE_VISION");
  });

  it("unknown extension -> UNKNOWN", () => {
    const d = detectFileType("file.xyz", true);
    expect(d.sourceType).toBe("UNKNOWN");
    expect(d.extractorStrategy).toBe("UNKNOWN");
  });
});
