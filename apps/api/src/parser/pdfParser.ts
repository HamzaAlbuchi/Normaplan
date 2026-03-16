import type { PlanElements } from "../types.js";

/** Type for pdf-parse (no @types package; avoid implicit any) */
type PdfParseFn = (buffer: Buffer) => Promise<{ text: string }>;

/**
 * Extract text from a PDF buffer using pdf-parse (CJS).
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse") as { default?: PdfParseFn };
  const pdfParse: PdfParseFn = typeof mod.default === "function" ? mod.default : (mod as unknown as PdfParseFn);
  const result = await pdfParse(buffer);
  return typeof result?.text === "string" ? result.text : "";
}

/**
 * Find numbers in text that could be dimensions (meters or cm).
 * Returns numbers in meters (converts cm if pattern suggests it).
 */
function findDimensionNumbers(text: string): number[] {
  const numbers: number[] = [];
  // Match: 1.20, 1,20, 120 (cm), 0.9 m, 1,2 m, 120cm, etc.
  const patterns = [
    /(\d+[,.]?\d*)\s*m\b/gi,
    /(\d+[,.]?\d*)\s*cm/gi,
    /\b(0\.\d{1,2}|1\.\d{1,2}|2\.\d?)\b/g,
    /\b(1[0-2]\d|8\d|9\d)\s*(?=cm|$)/gi,
  ];
  const seen = new Set<string>();
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const regex = new RegExp(re.source, re.flags);
    while ((m = regex.exec(text)) !== null) {
      let num = parseFloat(m[1].replace(",", "."));
      if (Number.isNaN(num)) continue;
      if (/cm/i.test(m[0]) || (re.source.includes("1[0-2]") && num >= 50 && num <= 150)) num = num / 100;
      if (num < 0.05 || num > 50) continue;
      const key = num.toFixed(3);
      if (!seen.has(key)) {
        seen.add(key);
        numbers.push(num);
      }
    }
  }
  return numbers;
}

/**
 * Extract a best-effort PlanElements from PDF text.
 * Uses heuristics to find dimension-like numbers and builds placeholder elements
 * so the rule engine can run. Accuracy is limited; JSON upload is more reliable.
 */
export async function parsePlanFromPdf(buffer: Buffer): Promise<PlanElements> {
  const text = await extractPdfText(buffer);
  if (!text || text.trim().length < 10) {
    throw new Error(
      "PDF enthält zu wenig extrahierbaren Text (typisch bei Bild-Grundrissen). " +
      "Setzen Sie GEMINI_API_KEY für visuelle Analyse, oder laden Sie einen JSON-Plan hoch."
    );
  }

  const dimensions = findDimensionNumbers(text);
  const rooms: PlanElements["rooms"] = [];
  const corridors: PlanElements["corridors"] = [];
  const doors: PlanElements["doors"] = [];
  const windows: PlanElements["windows"] = [];
  const stairs: PlanElements["stairs"] = [];
  const escapeRoutes: PlanElements["escapeRoutes"] = [];

  // Corridor widths: typically 1.0–2.0 m
  const widthCandidates = dimensions.filter((d) => d >= 0.8 && d <= 3);
  widthCandidates.slice(0, 5).forEach((widthM, i) => {
    corridors.push({
      id: `corridor-pdf-${i + 1}`,
      widthM,
      lengthM: 5,
    });
  });

  // Door widths: typically 0.7–1.2 m
  const doorWidths = dimensions.filter((d) => d >= 0.6 && d <= 1.3);
  doorWidths.slice(0, 10).forEach((widthM, i) => {
    doors.push({
      id: `door-pdf-${i + 1}`,
      widthM,
      accessible: undefined,
    });
  });

  // Stair dimensions: tread 0.24–0.32, riser 0.17–0.20, width ~1.0
  const smallDims = dimensions.filter((d) => d >= 0.15 && d <= 0.35);
  const stairWidths = dimensions.filter((d) => d >= 0.9 && d <= 1.5);
  if (smallDims.length >= 2 || stairWidths.length > 0 || dimensions.length > 0) {
    stairs.push({
      id: "stair-pdf-1",
      treadDepthM: smallDims[0] ?? 0.28,
      riserHeightM: smallDims[1] ?? 0.19,
      widthM: stairWidths[0] ?? 1.0,
    });
  }

  // One placeholder room if we have no rooms (so rule engine has something)
  if (rooms.length === 0) {
    const areaMatch = text.match(/(\d{1,4})[,.]?\d*\s*m²|(\d{1,4})[,.]?\d*\s*qm/i);
    const areaM2 = areaMatch ? parseFloat((areaMatch[1] || areaMatch[2] || "20").replace(",", ".")) : 20;
    rooms.push({
      id: "room-pdf-1",
      name: "Aus PDF extrahiert",
      areaM2: Number.isNaN(areaM2) ? 20 : Math.min(500, areaM2),
      windowAreaM2: 0,
    });
  }

  // One escape route placeholder if we have a larger dimension (length)
  const lengthCandidates = dimensions.filter((d) => d >= 5 && d <= 60);
  if (lengthCandidates.length > 0) {
    escapeRoutes.push({
      id: "route-pdf-1",
      lengthM: lengthCandidates[0],
      fromRoomId: rooms[0]?.id ?? "room-pdf-1",
      toExitId: "exit-1",
    });
  }

  return {
    rooms,
    corridors,
    doors,
    windows,
    stairs,
    escapeRoutes,
  };
}
