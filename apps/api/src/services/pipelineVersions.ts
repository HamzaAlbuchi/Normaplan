/**
 * Pipeline version constants for analysis reuse compatibility.
 * Reuse requires ALL of these to match; otherwise a fresh analysis is run.
 */

import { getRulesMetadata } from "../rules/declarativeRunner.js";

/** Version of extraction logic (bump when parser/extractor changes) */
export const EXTRACTION_VERSION = "1.0";

/** Version of declarative rules (from declarative-rules.json) */
export function getRulesVersion(): string {
  return getRulesMetadata().version;
}

/** Version of AI prompts (bump when Gemini/system prompts change) */
export const PROMPT_VERSION = "1.0";

/** Model identifier for AI extraction (e.g. Gemini model name) */
export const MODEL_VERSION = "gemini-1.5-flash";
