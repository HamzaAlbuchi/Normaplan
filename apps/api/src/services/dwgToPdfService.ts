/**
 * Converts DWG/DXF to PDF via ConvertAPI.
 * Acts as "man in the middle" so Gemini can process the PDF (Gemini doesn't support CAD).
 * Requires CONVERTAPI_SECRET. Free tier: 250 conversions at convertapi.com.
 */

const CONVERTAPI_BASE = "https://v2.convertapi.com";

export async function convertDwgToPdf(
  buffer: Buffer,
  filename: string,
  apiSecret: string
): Promise<Buffer> {
  const ext = filename.toLowerCase().endsWith(".dxf") ? "dxf" : "dwg";
  const url = `${CONVERTAPI_BASE}/convert/${ext}/to/pdf`;

  const body = {
    Parameters: [
      {
        Name: "File",
        FileValue: {
          Name: filename || `file.${ext}`,
          Data: buffer.toString("base64"),
        },
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiSecret.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = `ConvertAPI error ${res.status}`;
    try {
      const errJson = JSON.parse(errText) as { Message?: string };
      if (errJson.Message) msg = errJson.Message;
    } catch {
      if (errText) msg = errText.slice(0, 200);
    }
    throw new Error(msg);
  }

  const json = (await res.json()) as {
    Files?: Array<{ FileData?: string }>;
  };

  const fileData = json.Files?.[0]?.FileData;
  if (!fileData) {
    throw new Error("ConvertAPI returned no file data");
  }

  return Buffer.from(fileData, "base64");
}
