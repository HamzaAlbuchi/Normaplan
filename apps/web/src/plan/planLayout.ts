/**
 * Procedural layout for PlanElements.
 * Converts structured extraction JSON to 2D geometry for visualization.
 * Accuracy is not critical – simplified representation only.
 */

export interface RoomLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  areaM2: number;
  name?: string;
}

export interface DoorLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  roomIds?: string[];
}

export interface WindowLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  roomId: string;
}

export interface CorridorLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  length: number;
}

export interface PlanLayout {
  rooms: RoomLayout[];
  doors: DoorLayout[];
  windows: WindowLayout[];
  corridors: CorridorLayout[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface PlanElementsLike {
  rooms?: Array<{ id: string; name?: string; areaM2: number }>;
  corridors?: Array<{ id: string; widthM: number; lengthM?: number }>;
  doors?: Array<{ id: string; widthM: number; roomIds?: string[] }>;
  windows?: Array<{ id: string; areaM2: number; roomId: string }>;
}

const WALL_HEIGHT_M = 2.7;
const GAP_M = 0.3;
const DOOR_DEPTH_M = 0.15;
const WINDOW_DEPTH_M = 0.1;

export const WALL_HEIGHT = WALL_HEIGHT_M;

/**
 * Generate a simplified 2D layout from PlanElements.
 * Rooms are placed in a grid; doors/windows on room edges.
 */
export function buildPlanLayout(elements: PlanElementsLike): PlanLayout {
  const rooms = elements.rooms ?? [];
  const corridors = elements.corridors ?? [];
  const doors = elements.doors ?? [];
  const windows = elements.windows ?? [];

  const roomLayouts: RoomLayout[] = [];
  let cx = 0;
  let cy = 0;
  let rowHeight = 0;

  for (const r of rooms) {
    const area = Math.max(r.areaM2 ?? 10, 4);
    const side = Math.sqrt(area);
    const width = side * 1.2;
    const depth = side / 1.2;

    roomLayouts.push({
      id: r.id,
      x: cx,
      y: cy,
      width,
      depth,
      areaM2: r.areaM2,
      name: r.name,
    });

    cx += width + GAP_M;
    rowHeight = Math.max(rowHeight, depth);
  }

  const corridorLayouts: CorridorLayout[] = [];
  let corridorY = cy + rowHeight + GAP_M;
  for (const c of corridors) {
    const width = c.widthM;
    const length = c.lengthM ?? Math.max(cx, 6);
    corridorLayouts.push({
      id: c.id,
      x: 0,
      y: corridorY,
      width,
      length,
    });
    corridorY += length + GAP_M;
  }

  const doorLayouts: DoorLayout[] = [];
  for (let i = 0; i < doors.length; i++) {
    const d = doors[i]!;
    const room = roomLayouts.length > 0 ? roomLayouts[i % roomLayouts.length] : undefined;
    const width = Math.min(d.widthM, 1);
    const x = room ? room.x + room.width / 2 - width / 2 : i * 1.5;
    const y = room ? room.y + room.depth : (corridorLayouts[0]?.y ?? 0) - GAP_M - 0.5;
    doorLayouts.push({
      id: d.id,
      x,
      y,
      width,
      depth: DOOR_DEPTH_M,
      roomIds: d.roomIds,
    });
  }

  const windowLayouts: WindowLayout[] = [];
  for (const w of windows) {
    const room = roomLayouts.find((r) => r.id === w.roomId);
    const side = Math.sqrt(Math.max(w.areaM2, 0.5));
    const width = Math.min(side * 1.5, 2);
    const x = room ? room.x + room.width - width - 0.5 : 0;
    const y = room ? room.y + 0.5 : 0;
    windowLayouts.push({
      id: w.id,
      x,
      y,
      width,
      depth: WINDOW_DEPTH_M,
      roomId: w.roomId,
    });
  }

  const allX = roomLayouts.flatMap((r) => [r.x, r.x + r.width]);
  const allY = roomLayouts.flatMap((r) => [r.y, r.y + r.depth]);
  corridorLayouts.forEach((c) => {
    allX.push(c.x, c.x + c.length);
    allY.push(c.y, c.y + c.width);
  });
  doorLayouts.forEach((d) => {
    allX.push(d.x, d.x + d.width);
    allY.push(d.y, d.y + d.depth);
  });

  const minX = allX.length > 0 ? Math.min(0, ...allX) : 0;
  const minY = allY.length > 0 ? Math.min(0, ...allY) : 0;
  const maxX = allX.length > 0 ? Math.max(cx, ...allX) : 10;
  const maxY = allY.length > 0 ? Math.max(corridorY, ...allY) : 10;

  return {
    rooms: roomLayouts,
    doors: doorLayouts,
    windows: windowLayouts,
    corridors: corridorLayouts,
    bounds: { minX, minY, maxX, maxY },
  };
}
