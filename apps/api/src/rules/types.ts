import type { PlanElements, RuleViolation } from "../types.js";

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  regulationRef?: string;
  check: (elements: PlanElements) => RuleViolation[];
}
