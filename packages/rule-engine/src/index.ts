import type { PlanElements, RuleViolation, Severity } from "@baupilot/types";
import { rules } from "./rules/index.js";

export type { PlanElements, RuleViolation, Severity } from "@baupilot/types";
export { rules } from "./rules/index.js";

const RULE_ENGINE_VERSION = "0.1.0";

export interface RunOptions {
  runId: string;
  planId: string;
  ruleIds?: string[]; // if empty, run all
}

/**
 * Run all (or selected) rules on the given plan elements.
 * Pure function; no I/O.
 */
export function runRules(
  elements: PlanElements,
  options: RunOptions
): { violations: RuleViolation[]; ruleVersion: string } {
  const violations: RuleViolation[] = [];
  const toRun = options.ruleIds
    ? rules.filter((r) => options.ruleIds!.includes(r.id))
    : rules;

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
