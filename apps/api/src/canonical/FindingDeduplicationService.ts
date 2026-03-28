import type { NormalizedFinding } from "./canonicalTypes.js";
import type { CanonicalFinding, FindingSource } from "./canonicalTypes.js";
import { getCategoryForRule } from "./categoryForRule.js";

function hasOverlappingElements(a: string[], b: string[]): boolean {
  if (a.length === 0 && b.length === 0) return true;
  const setB = new Set(b);
  return a.some((id) => setB.has(id));
}

function hasOverlappingRooms(a: string[], b: string[]): boolean {
  if (a.length === 0 && b.length === 0) return true;
  const setB = new Set(b);
  return a.some((id) => setB.has(id));
}

function matchScore(a: NormalizedFinding, b: NormalizedFinding): number {
  if (a.normalizedType !== b.normalizedType) return 0;

  let score = 0.4;

  if (hasOverlappingElements(a.elementIds, b.elementIds)) score += 0.4;
  else if (hasOverlappingRooms(a.roomIds, b.roomIds)) score += 0.2;

  const aVal = a.measuredValue ?? a.requiredValue;
  const bVal = b.measuredValue ?? b.requiredValue;
  if (aVal != null && bVal != null && Math.abs(aVal - bVal) < 0.01) score += 0.1;

  if (a.regulationRef && b.regulationRef && a.regulationRef === b.regulationRef) score += 0.1;

  return Math.min(1, score);
}

const MIN_MERGE_SCORE = 0.5;

export function deduplicateFindings(normalized: NormalizedFinding[]): CanonicalFinding[] {
  const ruleFindings = normalized.filter((n) => n.source === "rule");
  const aiFindings = normalized.filter((n) => n.source === "ai");
  const merged = new Set<string>();
  const canonicals: CanonicalFinding[] = [];

  for (const rule of ruleFindings) {
    if (merged.has(rule.rawId)) continue;

    const matchingAi = aiFindings.filter((ai) => {
      if (merged.has(ai.rawId)) return false;
      return matchScore(rule, ai) >= MIN_MERGE_SCORE;
    });

    const allRawIds = [rule.rawId, ...matchingAi.map((a) => a.rawId)];
    matchingAi.forEach((a) => merged.add(a.rawId));
    merged.add(rule.rawId);

    const primarySource: FindingSource = "RULE_BASED";
    const supportingSources: FindingSource[] = matchingAi.length > 0 ? ["AI_ASSISTED"] : [];

    const elementIds = [...new Set([...rule.elementIds, ...matchingAi.flatMap((a) => a.elementIds)])];
    const roomIds = [...new Set([...rule.roomIds, ...matchingAi.flatMap((a) => a.roomIds)])];

    const measuredValue = rule.measuredValue ?? matchingAi[0]?.measuredValue;
    const requiredValue = rule.requiredValue ?? matchingAi[0]?.requiredValue;

    const aiDescription = matchingAi.length > 0 ? matchingAi.map((a) => a.message).join(" ") : undefined;

    canonicals.push({
      canonicalFindingId: `canon-${rule.rawId}`,
      normalizedType: rule.normalizedType,
      category: getCategoryForRule(rule.rawRuleId),
      severity: rule.severity,
      affectedElementIds: elementIds,
      affectedRoomIds: roomIds,
      measuredValue,
      requiredValue,
      reference: rule.regulationRef,
      title: rule.rawRuleName,
      description: aiDescription ? `${rule.message} (KI: ${aiDescription})` : rule.message,
      suggestion: rule.suggestion ?? matchingAi[0]?.suggestion,
      primarySource,
      supportingSources,
      confidence: matchingAi.length > 0 ? 0.9 : 0.95,
      rawSourceFindingIds: allRawIds,
      primaryRawId: rule.rawId,
      sourceCount: allRawIds.length,
    });
  }

  for (const ai of aiFindings) {
    if (merged.has(ai.rawId)) continue;

    merged.add(ai.rawId);
    canonicals.push({
      canonicalFindingId: `canon-${ai.rawId}`,
      normalizedType: ai.normalizedType,
      category: getCategoryForRule(ai.rawRuleId),
      severity: ai.severity,
      affectedElementIds: [...ai.elementIds],
      affectedRoomIds: [...ai.roomIds],
      measuredValue: ai.measuredValue,
      requiredValue: ai.requiredValue,
      reference: ai.regulationRef,
      title: ai.rawRuleName,
      description: ai.message,
      suggestion: ai.suggestion,
      primarySource: "AI_ONLY",
      supportingSources: [],
      confidence: 0.7,
      rawSourceFindingIds: [ai.rawId],
      primaryRawId: ai.rawId,
      sourceCount: 1,
    });
  }

  return canonicals.sort((a, b) => {
    const order = ["error", "warning", "info"];
    const ai = order.indexOf(a.severity);
    const bi = order.indexOf(b.severity);
    if (ai !== bi) return ai - bi;
    return a.title.localeCompare(b.title);
  });
}
