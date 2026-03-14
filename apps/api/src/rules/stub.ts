/**
 * Stub rule runner for minimal deploy. Returns no violations.
 * Replace with @baupilot/rule-engine when extending.
 */
import type { PlanElements, RuleViolation } from "../types.js";

const RULE_VERSION = "stub-0.1";

export interface RunOptions {
  runId: string;
  planId: string;
  ruleIds?: string[];
}

export function runRules(
  _elements: PlanElements,
  _options: RunOptions
): { violations: RuleViolation[]; ruleVersion: string } {
  return { violations: [], ruleVersion: RULE_VERSION };
}
