import type { PlanElements, RuleViolation } from "../types.js";
import { runDeclarativeRules } from "./declarativeRunner.js";

const RULE_ENGINE_VERSION = "1.0.0";

export interface RunOptions {
  runId: string;
  planId: string;
  /** Bundesland code (e.g. BY, NW); required – only rules for this state are run */
  state: string;
  ruleIds?: string[];
}

export function runRules(
  elements: PlanElements,
  options: RunOptions
): { violations: RuleViolation[]; ruleVersion: string } {
  const violations = runDeclarativeRules(elements, options.state, options.ruleIds);
  return { violations, ruleVersion: RULE_ENGINE_VERSION };
}
