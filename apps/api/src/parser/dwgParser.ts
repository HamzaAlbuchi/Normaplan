/**
 * DWG/DXF parser using Gemini AI.
 * Note: Gemini may not support DWG/DXF natively. If upload or extraction fails,
 * the caller should suggest converting to PDF and uploading that instead.
 * Requires GEMINI_API_KEY.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { PlanElements } from "../types.js";
import type { ProjectContext } from "./geminiParser.js";
import {
  extractJsonFromResponse,
  parseAndValidateElements,
} from "./geminiParser.js";

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

function buildDwgPrompt(ctx: ProjectContext): string {
  const projectTypeLabel =
    ctx.projectType === "residential"
      ? "Wohngebäude"
      : ctx.projectType === "commercial"
        ? "Gewerbe"
        : ctx.projectType === "mixed_use"
          ? "Mischnutzung"
          : ctx.projectType ?? "nicht angegeben";

  return `Analysiere diese CAD-Datei (DWG/DXF) und extrahiere die Grundriss-Elemente als gültiges JSON.

Projektkontext (für regelrelevante Prüfung):
- PLZ: ${ctx.zipCode}
- Bundesland: ${ctx.state}
- Gebäudetyp: ${projectTypeLabel}

${PLAN_ELEMENTS_SCHEMA}

Antworte NUR mit dem JSON-Objekt, ohne Markdown, ohne Erklärungen. Beginne mit { und ende mit }.
Erfinde keine Elemente – extrahiere nur was im Plan erkennbar ist. IDs eindeutig (z.B. room-1, door-1).
Fenster: roomId muss auf eine existierende room.id verweisen.`;
}

/**
 * Extract PlanElements from DWG/DXF using Gemini File API.
 * Writes to temp file, uploads, then deletes.
 */
export async function parsePlanFromDwgWithGemini(
  buffer: Buffer,
  context: ProjectContext,
  apiKey: string,
  ext: string
): Promise<PlanElements> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const tmpDir = os.tmpdir();
  const tmpPath = path.join(tmpDir, `baupilot-${Date.now()}${ext}`);
  try {
    await fs.writeFile(tmpPath, buffer);

    const mimeType = ext === ".dxf" ? "application/dxf" : "application/acad";
    const uploaded = await ai.files.upload({
      file: tmpPath,
      config: { mimeType },
    });

    const fileUri =
      uploaded.uri ??
      (uploaded.name ? `https://generativelanguage.googleapis.com/v1beta/${uploaded.name}` : null);
    if (!fileUri) {
      throw new Error("File upload did not return a URI");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { fileData: { fileUri, mimeType: uploaded.mimeType ?? mimeType } },
        { text: buildDwgPrompt(context) },
      ],
      config: { temperature: 0, seed: 42 },
    });

    const text = (response as { text?: string }).text ?? "";
    if (!text) {
      throw new Error("Gemini returned empty response for DWG file");
    }

    const jsonStr = extractJsonFromResponse(text);
    return parseAndValidateElements(jsonStr);
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}
