/** Minimal violation shape for report / canonical pipeline (matches API + web). */
export interface ViolationLike {
  id?: string;
  ruleId?: string;
  ruleName?: string;
  severity?: string;
  message?: string;
  suggestion?: string | null;
  elementIds?: string[];
  actualValue?: number | null;
  requiredValue?: number | null;
  regulationRef?: string | null;
}
