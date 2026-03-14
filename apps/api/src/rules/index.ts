import type { PlanElements, RuleViolation } from "../types.js";
import { VALID_STATE_CODES } from "../plzToState.js";
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

const RULE_ENGINE_VERSION = "0.1.0";

export interface RunOptions {
  runId: string;
  planId: string;
  /** Bundesland code (e.g. BY, NW); required – only rules for this state are run */
  state: string;
  ruleIds?: string[];
}

function appliesToState(rule: Rule, state: string): boolean {
  const states = rule.applicableStates ?? VALID_STATE_CODES;
  return states.includes(state);
}

export function runRules(
  elements: PlanElements,
  options: RunOptions
): { violations: RuleViolation[]; ruleVersion: string } {
  const violations: RuleViolation[] = [];
  const byState = rules.filter((r) => appliesToState(r, options.state));
  const toRun = options.ruleIds
    ? byState.filter((r) => options.ruleIds!.includes(r.id))
    : byState;

  for (const rule of toRun) {
    try {
      const result = rule.check(elements);
      violations.push(...result);
    } catch (err) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: "error",
        message: `Rule check failed: ${err instanceof Error ? err.message : String(err)}`,
        elementIds: [],
        regulationRef: rule.regulationRef,
      });
    }
  }

  return { violations, ruleVersion: RULE_ENGINE_VERSION };
}
