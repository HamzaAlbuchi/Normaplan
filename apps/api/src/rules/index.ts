import type { PlanElements, RuleViolation } from "../types.js";
import { runDeclarativeRules, getRulesMetadata } from "./declarativeRunner.js";

const RULE_ENGINE_VERSION = "1.0.0";

export interface RunOptions {
  runId: string;
  planId: string;
  /** Bundesland code (e.g. BY, NW); required – only rules for this state are run */
  state: string;
  ruleIds?: string[];
  /** When set, only run rules in these categories (e.g. accessibility, fire, escape) */
  categories?: string[];
}

export function runRules(
  elements: PlanElements,
  options: RunOptions
): { violations: RuleViolation[]; ruleVersion: string } {
  let ruleIds = options.ruleIds;
  if (options.categories?.length) {
    const meta = getRulesMetadata();
    const ids = meta.rules
      .filter((r) => options.categories!.includes(r.category))
      .map((r) => r.id);
    ruleIds = ruleIds ? ruleIds.filter((id) => ids.includes(id)) : ids;
  }
  const violations = runDeclarativeRules(elements, options.state, ruleIds);
  return { violations, ruleVersion: RULE_ENGINE_VERSION };
}
