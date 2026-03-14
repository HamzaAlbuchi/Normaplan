import type { PlanElements, RuleViolation } from "@baupilot/types";

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  regulationRef?: string;
  check: (elements: PlanElements) => RuleViolation[];
}
