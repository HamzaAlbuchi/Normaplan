import type { PlanElements } from "../types.js";
import path from "node:path";

/** Recursively get first number value from an IFC property object. */
function extractNumber(obj: unknown): number | undefined {
  if (typeof obj === "number" && !Number.isNaN(obj)) return obj;
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    if (typeof o.value === "number" && !Number.isNaN(o.value)) return o.value;
    for (const v of Object.values(o)) {
      const n = extractNumber(v);
      if (n !== undefined) return n;
    }
  }
  return undefined;
}

/** Get string from IFC property (Name, LongName, etc.). */
function extractString(obj: unknown): string | undefined {
  if (typeof obj === "string") return obj;
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    if (typeof o.value === "string") return o.value;
    if (typeof o.Name === "string") return o.Name;
    if (typeof o.LongName === "string") return o.LongName;
    for (const v of Object.values(o)) {
      const s = extractString(v);
      if (s !== undefined) return s;
    }
  }
  return undefined;
}

/** Collect all numbers from an object (for property sets). */
function collectNumbers(obj: unknown, min?: number, max?: number): number[] {
  const out: number[] = [];
  if (typeof obj === "number" && !Number.isNaN(obj)) {
    if (min == null || obj >= min) if (max == null || obj <= max) out.push(obj);
    return out;
  }
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    if (typeof o.value === "number" && !Number.isNaN(o.value)) {
      const v = o.value;
      if (min == null || v >= min) if (max == null || v <= max) out.push(v);
    }
    for (const v of Object.values(o)) {
      out.push(...collectNumbers(v, min, max));
    }
  }
  return out;
}

/** Find a number in a reasonable range for width (meters). */
function findWidth(obj: unknown): number | undefined {
  const nums = collectNumbers(obj, 0.2, 5);
  return nums.length > 0 ? nums[0] : undefined;
}

/** Find a number for area (m²). */
function findArea(obj: unknown): number | undefined {
  const nums = collectNumbers(obj, 0.1, 10000);
  return nums.length > 0 ? nums[0] : undefined;
}

/**
 * Extract PlanElements from an IFC/BIM file using web-ifc (Node build).
 * Maps IfcSpace → rooms/corridors, IfcDoor → doors, IfcWindow → windows, IfcStair/IfcStairFlight → stairs.
 */
export async function parsePlanFromIfc(buffer: Buffer): Promise<PlanElements> {
  const { IfcAPI } = await import("web-ifc/web-ifc-api-node.js");
  const ifcApi = new IfcAPI();
  // Resolve web-ifc package dir (works from apps/api or monorepo root)
  const wasmDir = path.join(process.cwd(), "node_modules", "web-ifc");
  await ifcApi.Init((p: string) => (p.endsWith(".wasm") ? path.join(wasmDir, "web-ifc-node.wasm") : path.join(wasmDir, p)));

  const data = new Uint8Array(buffer);
  const modelID = ifcApi.OpenModel(data);
  if (modelID < 0) throw new Error("Failed to open IFC model");

  const rooms: PlanElements["rooms"] = [];
  const corridors: PlanElements["corridors"] = [];
  const doors: PlanElements["doors"] = [];
  const windows: PlanElements["windows"] = [];
  const stairs: PlanElements["stairs"] = [];
  const escapeRoutes: PlanElements["escapeRoutes"] = [];

  const schema = ifcApi.GetModelSchema(modelID) || "";
  const is2x3 = /2x3|2X3/i.test(schema);

  const entityTypes: { name: string; kind: "space" | "door" | "window" | "stair" }[] = [
    { name: is2x3 ? "IFCSPACE" : "IfcSpace", kind: "space" },
    { name: is2x3 ? "IFCDOOR" : "IfcDoor", kind: "door" },
    { name: is2x3 ? "IFCWINDOW" : "IfcWindow", kind: "window" },
    { name: is2x3 ? "IFCSTAIRFLIGHT" : "IfcStairFlight", kind: "stair" },
    { name: is2x3 ? "IFCSTAIR" : "IfcStair", kind: "stair" },
  ];

  for (const { name, kind } of entityTypes) {
    let typeCode: number;
    try {
      typeCode = ifcApi.GetTypeCodeFromName(name);
    } catch {
      continue;
    }
    if (typeCode === 0) continue;

    const ids = ifcApi.GetLineIDsWithType(modelID, typeCode, false);
    const size = ids.size();
    for (let i = 0; i < size; i++) {
      const expressID = ids.get(i);
      try {
        const props = await ifcApi.properties.getItemProperties(modelID, expressID, true);
        const nameStr = extractString(props) || `ifc-${expressID}`;

        if (kind === "space") {
          const psets = await ifcApi.properties.getPropertySets(modelID, expressID, true).catch(() => []);
          const areaM2 = findArea(props) ?? (Array.isArray(psets) ? findArea(psets) : undefined) ?? 15;
          const isCirculation = /flur|corridor|hall|gang|zirkulation|circulation|egress/i.test(nameStr);
          if (isCirculation) {
            const widthM = findWidth(props) ?? (Array.isArray(psets) ? findWidth(psets) : undefined) ?? 1.2;
            corridors.push({
              id: `ifc-corridor-${expressID}`,
              widthM: widthM > 0 ? widthM : 1.2,
              lengthM: areaM2 > 0 ? areaM2 / 1.2 : undefined,
            });
          } else {
            rooms.push({
              id: `ifc-room-${expressID}`,
              name: nameStr || undefined,
              areaM2: areaM2 > 0 ? areaM2 : 15,
            });
          }
        } else if (kind === "door") {
          const psets = await ifcApi.properties.getPropertySets(modelID, expressID, true).catch(() => []);
          const widthM = findWidth(props) ?? (Array.isArray(psets) ? findWidth(psets) : undefined) ?? 0.9;
          doors.push({
            id: `ifc-door-${expressID}`,
            widthM: widthM > 0 ? widthM : 0.9,
          });
        } else if (kind === "window") {
          const psets = await ifcApi.properties.getPropertySets(modelID, expressID, true).catch(() => []);
          const areaM2 = findArea(props) ?? (Array.isArray(psets) ? findArea(psets) : undefined) ?? 1;
          windows.push({
            id: `ifc-window-${expressID}`,
            areaM2: areaM2 > 0 ? areaM2 : 1,
            roomId: rooms[0]?.id ?? "ifc-room-1",
          });
        } else if (kind === "stair") {
          const psets = await ifcApi.properties.getPropertySets(modelID, expressID, true).catch(() => []);
          const allNums = collectNumbers(props, 0.05, 5);
          const smallNums = collectNumbers(props, 0.15, 0.35);
          const widthM = findWidth(props) ?? (Array.isArray(psets) ? findWidth(psets) : undefined) ?? 1.0;
          stairs.push({
            id: `ifc-stair-${expressID}`,
            treadDepthM: smallNums[0] ?? 0.26,
            riserHeightM: smallNums[1] ?? 0.2,
            widthM: widthM > 0 ? widthM : (allNums.find((n) => n >= 0.8 && n <= 2) ?? 1.0),
          });
        }
      } catch {
        // Skip element if property read fails
      }
    }
  }

  ifcApi.CloseModel(modelID);

  if (rooms.length === 0 && corridors.length === 0) {
    rooms.push({ id: "ifc-room-1", name: "Aus IFC extrahiert", areaM2: 20 });
  }
  if (windows.length > 0 && rooms.length > 0) {
    windows.forEach((w, i) => {
      w.roomId = rooms[Math.min(i, rooms.length - 1)]!.id;
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
