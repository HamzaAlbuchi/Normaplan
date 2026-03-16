/**
 * Gemini-based PDF parser for floor plans.
 * Extracts PlanElements from PDF using project context (PLZ, building type).
 * Optionally fetches AI-detected violations. Requires GEMINI_API_KEY.
 */

import type { PlanElements, RuleViolation } from "../types.js";
import { parsePlanFromPdf } from "./pdfParser.js";

export interface ProjectContext {
  zipCode: string;
  state: string;
  projectType?: string | null;
}

const PLAN_ELEMENTS_SCHEMA = `
Das JSON-Objekt muss folgende Struktur haben (alle Maße in Metern):
{
  "rooms": [{"id": "room-1", "name": "...", "areaM2": number, "windowAreaM2": number, "ceilingHeightM": number?, "roomType": "living"|"bathroom"|"kitchen"|...}],
  "corridors": [{"id": "corridor-1", "widthM": number, "lengthM": number}],
  "doors": [{"id": "door-1", "widthM": number, "clearWidthM": number?, "accessible": boolean?}],
  "windows": [{"id": "window-1", "areaM2": number, "roomId": "room-1", "clearOpeningWidthM": number?, "clearOpeningHeightM": number?, "sillHeightM": number?}],
  "stairs": [{"id": "stair-1", "treadDepthM": number, "riserHeightM": number, "widthM": number}],
  "escapeRoutes": [{"id": "route-1", "lengthM": number, "fromRoomId": "room-1", "toExitId": "exit-1"}]
}
`;

function buildPrompt(ctx: ProjectContext): string {
  const projectTypeLabel =
    ctx.projectType === "residential"
      ? "Wohngebäude"
      : ctx.projectType === "commercial"
        ? "Gewerbe"
        : ctx.projectType === "mixed_use"
          ? "Mischnutzung"
          : ctx.projectType ?? "nicht angegeben";

  return `Analysiere diesen Grundriss-PDF und extrahiere die Plan-Elemente als gültiges JSON.

Projektkontext (für regelrelevante Prüfung):
- PLZ: ${ctx.zipCode}
- Bundesland: ${ctx.state}
- Gebäudetyp: ${projectTypeLabel}

${PLAN_ELEMENTS_SCHEMA}

Antworte NUR mit dem JSON-Objekt, ohne Markdown, ohne Erklärungen. Beginne mit { und ende mit }.
Erfinde keine Elemente – extrahiere nur was im Plan erkennbar ist. IDs eindeutig (z.B. room-1, door-1).
Fenster: roomId muss auf eine existierende room.id verweisen.`;
}

export function extractJsonFromResponse(text: string): string {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini response contains no valid JSON object");
  }
  return trimmed.slice(start, end + 1);
}

export function parseAndValidateElements(jsonStr: string): PlanElements {
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  const rooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
  const corridors = Array.isArray(parsed.corridors) ? parsed.corridors : [];
  const doors = Array.isArray(parsed.doors) ? parsed.doors : [];
  const windows = Array.isArray(parsed.windows) ? parsed.windows : [];
  const stairs = Array.isArray(parsed.stairs) ? parsed.stairs : [];
  const escapeRoutes = Array.isArray(parsed.escapeRoutes) ? parsed.escapeRoutes : [];

  return {
    rooms: rooms as PlanElements["rooms"],
    corridors: corridors as PlanElements["corridors"],
    doors: doors as PlanElements["doors"],
    windows: windows as PlanElements["windows"],
    stairs: stairs as PlanElements["stairs"],
    escapeRoutes: escapeRoutes as PlanElements["escapeRoutes"],
  };
}

/**
 * Extract PlanElements from PDF using Gemini API.
 * Requires GEMINI_API_KEY. Returns null if not configured.
 */
export async function parsePlanFromPdfWithGemini(
  buffer: Buffer,
  context: ProjectContext,
  apiKey: string
): Promise<PlanElements> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const contents = [
    {
      inlineData: {
        mimeType: "application/pdf",
        data: buffer.toString("base64"),
      },
    },
    {
      text: buildPrompt(context),
    },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
  });

  const text = (response as { text?: string }).text ?? "";
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  const jsonStr = extractJsonFromResponse(text);
  return parseAndValidateElements(jsonStr);
}

/**
 * Parse PDF: use Gemini if GEMINI_API_KEY is set, else fall back to pdf-parse.
 */
export async function parsePlanFromPdfWithContext(
  buffer: Buffer,
  context: ProjectContext,
  geminiApiKey: string
): Promise<PlanElements> {
  if (geminiApiKey && geminiApiKey.trim().length > 0) {
    try {
      return await parsePlanFromPdfWithGemini(buffer, context, geminiApiKey.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Gemini PDF-Analyse fehlgeschlagen: ${msg}. Fallback auf Text-Extraktion.`);
    }
  }
  return parsePlanFromPdf(buffer);
}

const VIOLATIONS_PROMPT = `Analysiere die Plan-Elemente und prüfe sie gegen deutsche Bauvorschriften (MBO, DIN, LBO, Landesbauordnungen).
Antworte NUR mit einem JSON-Objekt in diesem Format (ohne Markdown, ohne Erklärungen):
{
  "violations": [
    {
      "ruleId": "ai-gemini-1",
      "ruleName": "Kurzbeschreibung der Regel",
      "severity": "info" | "warning" | "error",
      "message": "Konkrete Beschreibung des Verstoßes",
      "suggestion": "Empfehlung zur Behebung (optional)",
      "elementIds": ["room-1", "door-1"],
      "actualValue": 0.85,
      "requiredValue": 0.9,
      "regulationRef": "DIN 18040-2 oder MBO §..."
    }
  ]
}

Regeln: severity muss info, warning oder error sein. elementIds müssen existierende IDs aus den Plan-Elementen sein.
Liste nur echte, plausible Verstöße. Wenn keine Verstöße gefunden werden, antworte mit {"violations": []}.`;

function buildViolationsPrompt(ctx: ProjectContext, elementsJson: string): string {
  const projectTypeLabel =
    ctx.projectType === "residential"
      ? "Wohngebäude"
      : ctx.projectType === "commercial"
        ? "Gewerbe"
        : ctx.projectType === "mixed_use"
          ? "Mischnutzung"
          : ctx.projectType ?? "nicht angegeben";

  return `Projektkontext: PLZ ${ctx.zipCode}, Bundesland ${ctx.state}, Gebäudetyp ${projectTypeLabel}.

Plan-Elemente (JSON):
${elementsJson}

${VIOLATIONS_PROMPT}`;
}

function parseViolationsResponse(text: string): RuleViolation[] {
  const jsonStr = extractJsonFromResponse(text);
  const parsed = JSON.parse(jsonStr) as { violations?: unknown[] };
  const arr = Array.isArray(parsed.violations) ? parsed.violations : [];
  const validSeverities = ["info", "warning", "error"] as const;

  return arr
    .filter((v): v is Record<string, unknown> => v != null && typeof v === "object")
    .map((v) => {
      const severity = validSeverities.includes((v.severity as string) as (typeof validSeverities)[number])
        ? (v.severity as (typeof validSeverities)[number])
        : "warning";
      const elementIds = Array.isArray(v.elementIds)
        ? (v.elementIds as string[]).filter((id): id is string => typeof id === "string")
        : [];
      return {
        ruleId: String(v.ruleId ?? "ai-gemini-unknown").startsWith("ai-gemini-")
          ? String(v.ruleId)
          : `ai-gemini-${String(v.ruleId ?? "unknown")}`,
        ruleName: String(v.ruleName ?? "AI erkannte Abweichung"),
        severity,
        message: String(v.message ?? "Möglicher Verstoß gegen Bauvorschriften"),
        suggestion: v.suggestion != null ? String(v.suggestion) : undefined,
        elementIds,
        actualValue: typeof v.actualValue === "number" ? v.actualValue : undefined,
        requiredValue: typeof v.requiredValue === "number" ? v.requiredValue : undefined,
        regulationRef: v.regulationRef != null ? String(v.regulationRef) : undefined,
      } satisfies RuleViolation;
    });
}

/**
 * Fetch AI-detected violations from Gemini based on PlanElements and project context.
 * Returns empty array if API key is missing or Gemini fails.
 */
export async function fetchAiViolationsFromGemini(
  elements: PlanElements,
  context: ProjectContext,
  apiKey: string
): Promise<RuleViolation[]> {
  if (!apiKey?.trim()) return [];

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    const elementsJson = JSON.stringify(elements, null, 0);
    const prompt = buildViolationsPrompt(context, elementsJson);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
    });

    const text = (response as { text?: string }).text ?? "";
    if (!text) return [];

    return parseViolationsResponse(text);
  } catch {
    return [];
  }
}
