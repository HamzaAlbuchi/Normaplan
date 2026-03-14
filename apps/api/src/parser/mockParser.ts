import type { PlanElements } from "../types.js";

/**
 * MVP: Mock plan parser.
 * - In production, replace with PDF text/layer extraction, IFC parser, or DWG conversion.
 * - For MVP we accept JSON upload of plan elements (see sample in docs).
 */
export function parsePlanFromJson(json: string): PlanElements {
  const parsed = JSON.parse(json) as PlanElements;
  if (!parsed.rooms) parsed.rooms = [];
  if (!parsed.corridors) parsed.corridors = [];
  if (!parsed.doors) parsed.doors = [];
  if (!parsed.windows) parsed.windows = [];
  if (!parsed.stairs) parsed.stairs = [];
  if (!parsed.escapeRoutes) parsed.escapeRoutes = [];
  return parsed;
}

/**
 * TODO: Extract plan elements from PDF (text, dimensions, layers).
 * Options: pdf-lib, pdfjs-dist, or external API.
 */
// export async function parsePlanFromPdf(buffer: Buffer): Promise<PlanElements> {
//   throw new Error("PDF parsing not implemented in MVP");
// }
