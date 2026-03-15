/**
 * Declarative rule runner – interprets JSON rule definitions and runs them against PlanElements.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { PlanElements, RuleViolation } from "../types.js";
import { VALID_STATE_CODES } from "../plzToState.js";

type ElementType = keyof PlanElements;
type Operator = "<" | ">" | "<=" | ">=" | "==" | "!=" | "not_between";

interface DeclarativeCheck {
  elementType: string;
  property: string;
  operator: Operator;
  threshold: number | boolean | string | number[];
  /** When set, threshold is taken from element[thresholdProperty] (e.g. stairWidthM) */
  thresholdProperty?: string;
  severity: "info" | "warning" | "error";
  messageTemplate: string;
  suggestion?: string;
  requiredValue?: number | string | boolean;
  /** When set, requiredValue for display is taken from element[requiredValueProperty] */
  requiredValueProperty?: string;
  filter?: Record<string, unknown>;
}

interface DeclarativeRule {
  id: string;
  name: string;
  description: string;
  category: string;
  regulationRef?: string;
  applicableStates: string[];
  checks: DeclarativeCheck[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesJson = JSON.parse(
  readFileSync(join(__dirname, "declarative-rules.json"), "utf-8")
) as { version: string; rules: DeclarativeRule[] };

function appliesToState(rule: DeclarativeRule, state: string): boolean {
  const states = rule.applicableStates;
  if (!states || states.length === 0) return true;
  if (states.includes("ALL")) return true;
  return states.includes(state);
}

function getElementArray(elements: PlanElements, elementType: string): { id: string; [k: string]: unknown }[] {
  const custom: Record<string, unknown[] | undefined> = {
    railings: elements.railings,
    walls: elements.walls,
    stairwells: elements.stairwells,
    handrails: elements.handrails,
    stair_landings: elements.stair_landings,
    access_roads: elements.access_roads,
    apartments: elements.apartments,
    kitchens: elements.kitchens,
    showers: elements.showers,
    entrances: elements.entrances,
    balcony_doors: elements.balcony_doors,
    trash_rooms: elements.trash_rooms,
    lifts: elements.lifts,
    lift_foyers: elements.lift_foyers,
    thresholds: elements.thresholds,
    toilets: elements.toilets,
    washbasins: elements.washbasins,
    ramps: elements.ramps,
    balconies: elements.balconies,
    site: elements.site,
    partition_walls: elements.partition_walls,
    floors: elements.floors,
    living_units: elements.living_units,
    basement_rooms: elements.basement_rooms,
    roof: elements.roof,
  };
  if (elementType in custom) {
    const arr = custom[elementType];
    return (arr ?? []) as { id: string; [k: string]: unknown }[];
  }
  if (elementType === "building") {
    const b = elements.building ?? elements.buildings?.[0];
    return b ? [b as { id: string; [k: string]: unknown }] : [];
  }
  const key = elementType as ElementType;
  const arr = elements[key];
  if (Array.isArray(arr)) return arr as { id: string; [k: string]: unknown }[];
  return [];
}

function getPropertyValue(
  el: Record<string, unknown>,
  property: string,
  elements: PlanElements,
  elementType: string,
  elementId: string
): unknown {
  // Aliases and computed properties
  if (property === "heightM") return el.heightM ?? el.ceilingHeightM;
  if (property === "clearWidthM") return el.clearWidthM ?? el.widthM;
  if (property === "windowAreaToFloorRatio") {
    const area = Number(el.areaM2) || 0;
    const windowArea = Number(el.windowAreaM2) ?? 0;
    if (area <= 0) return undefined;
    return windowArea / area;
  }
  if (property === "hasWindow") {
    const windowArea = Number(el.windowAreaM2) ?? 0;
    if (windowArea > 0) return true;
    const roomId = el.id;
    const hasLinkedWindow = elements.windows?.some((w) => w.roomId === roomId);
    return !!hasLinkedWindow;
  }
  if (property === "stepFormulaValue") {
    const tread = Number(el.treadDepthM);
    const riser = Number(el.riserHeightM);
    if (!tread || !riser) return undefined;
    return 2 * riser + tread;
  }
  return el[property];
}

function matchesFilter(el: Record<string, unknown>, filter?: Record<string, unknown>): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [k, v] of Object.entries(filter)) {
    if (k === "roomType" && v === "bathroom") {
      const roomType = el.roomType as string | undefined;
      const name = (el.name as string)?.toLowerCase() ?? "";
      if (roomType === "bathroom") return true;
      if (name.includes("bad") || name.includes("wc") || name.includes("badezimmer") || name.includes("sanitär"))
        return true;
      return false;
    }
    if (k === "leadsToBoilerRoom" && v === true) {
      return el.leadsToBoilerRoom === true;
    }
    if (k === "isApartmentEntrance" && v === true) {
      return el.isApartmentEntrance === true;
    }
    if (el[k] !== v) return false;
  }
  return true;
}

function compare(val: unknown, operator: Operator, threshold: number | boolean | string | number[]): boolean {
  if (val === undefined || val === null) return false;

  if (operator === "not_between") {
    const [lo, hi] = threshold as number[];
    const n = Number(val);
    if (Number.isNaN(n)) return false;
    return n < lo || n > hi;
  }

  if (operator === "==") return val === threshold;
  if (operator === "!=") return val !== threshold;

  const n = Number(val);
  const t = typeof threshold === "number" ? threshold : Number(threshold);
  if (Number.isNaN(n)) return false;

  switch (operator) {
    case "<":
      return n < t;
    case ">":
      return n > t;
    case "<=":
      return n <= t;
    case ">=":
      return n >= t;
    default:
      return false;
  }
}

function formatMessage(
  template: string,
  id: string,
  actual: unknown,
  required: unknown,
  property: string
): string {
  let s = template
    .replace(/\{\{id\}\}/g, String(id))
    .replace(/\{\{required\}\}/g, String(required));
  if (property === "windowAreaToFloorRatio" && typeof actual === "number") {
    s = s.replace(/\{\{actual\}\}/g, (actual * 100).toFixed(1));
  } else {
    s = s.replace(/\{\{actual\}\}/g, String(actual));
  }
  return s;
}

export function runDeclarativeRules(
  elements: PlanElements,
  state: string,
  ruleIds?: string[]
): RuleViolation[] {
  const rules = rulesJson.rules as DeclarativeRule[];
  const violations: RuleViolation[] = [];

  const toRun = rules.filter((r) => appliesToState(r, state));
  const filtered = ruleIds ? toRun.filter((r) => ruleIds.includes(r.id)) : toRun;

  for (const rule of filtered) {
    for (const check of rule.checks) {
      const arr = getElementArray(elements, check.elementType);
      for (const el of arr) {
        const elObj = el as Record<string, unknown>;
        if (!matchesFilter(elObj, check.filter)) continue;

        const val = getPropertyValue(elObj, check.property, elements, check.elementType, el.id);
        if (val === undefined && check.operator !== "==" && check.operator !== "!=") continue;

        let threshold = check.threshold;
        if (check.thresholdProperty) {
          const dyn = elObj[check.thresholdProperty];
          if (dyn === undefined || dyn === null) continue;
          threshold = typeof dyn === "number" ? dyn : Number(dyn);
        }
        const required = check.requiredValueProperty
          ? (elObj[check.requiredValueProperty] ?? check.requiredValue ?? threshold)
          : (check.requiredValue ?? threshold);
        if (compare(val, check.operator, threshold)) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: check.severity,
            message: formatMessage(check.messageTemplate, el.id, val, required, check.property),
            suggestion: check.suggestion,
            elementIds: [el.id],
            actualValue: typeof val === "number" ? val : undefined,
            requiredValue: typeof required === "number" ? required : undefined,
            regulationRef: rule.regulationRef,
          });
        }
      }
    }
  }

  return violations;
}
