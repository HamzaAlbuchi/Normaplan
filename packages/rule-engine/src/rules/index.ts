import { corridorWidth } from "./corridorWidth.js";
import { doorWidthAccessible } from "./doorWidthAccessible.js";
import { windowAreaRoom } from "./windowAreaRoom.js";
import { escapeRouteLength } from "./escapeRouteLength.js";
import { stairDimensions } from "./stairDimensions.js";
import type { Rule } from "./types.js";

export const rules: Rule[] = [
  corridorWidth,
  doorWidthAccessible,
  windowAreaRoom,
  escapeRouteLength,
  stairDimensions,
];
