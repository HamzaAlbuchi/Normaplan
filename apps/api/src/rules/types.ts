import type { PlanElements, RuleViolation } from "../types.js";

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  regulationRef?: string;
  /** State codes (ISO 3166-2:DE) this rule applies to. If undefined, applies to all states. */
  applicableStates?: string[];
  check: (elements: PlanElements) => RuleViolation[];
}
