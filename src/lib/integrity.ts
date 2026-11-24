import type { Assessment, Confidence, Relationship } from "./domain";

/**
 * Research-integrity guards applied to AI output before it is stored.
 * A verdict must be backed by stored evidence; absence of evidence is UNVERIFIED, never "false".
 */
export function reconcileClaimAssessment(input: {
  proposed: Assessment;
  confidence: Confidence;
  relationships: Relationship[];
  distinctSources: number;
  researchAvailable: boolean;
}): { assessment: Assessment; confidence: Confidence; downgraded: boolean } {
  const { proposed, relationships, distinctSources, researchAvailable } = input;
  const has = (r: Relationship) => relationships.includes(r);
  let assessment: Assessment = proposed;

  if (!researchAvailable || relationships.length === 0 || (!has("supports") && !has("contradicts") && !has("context"))) {
    assessment = "unverified";
  } else if (proposed === "supported" && !has("supports")) {
    assessment = "unverified";
  } else if (proposed === "contradicted" && !has("contradicts")) {
    assessment = "unverified";
  } else if (proposed === "mixed" && !(has("supports") || has("contradicts"))) {
    assessment = "unverified";
  } else if (proposed === "missing_context" && !(has("context") || has("supports") || has("contradicts"))) {
    assessment = "unverified";
  }

  let confidence: Confidence = input.confidence;
  if (assessment === "unverified" && proposed !== "unverified") confidence = "low";
  if (!researchAvailable) confidence = "low";
  if (distinctSources <= 1 && confidence === "high") confidence = "medium";

  return { assessment, confidence, downgraded: assessment !== proposed };
}

/** Overall verdict must be consistent with the individual claim verdicts. */
export function deriveOverallAssessment(claimAssessments: Assessment[], proposed?: Assessment | null): Assessment {
  if (claimAssessments.length === 0) return "unverified";
  const set = new Set(claimAssessments);
  let computed: Assessment;
  if (set.size === 1) computed = claimAssessments[0] ?? "unverified";
  else if ([...set].every((a) => a === "supported" || a === "missing_context")) computed = "missing_context";
  else computed = "mixed";

  if (!proposed) return computed;
  if (set.size === 1) return computed;
  if (proposed === "mixed") return "mixed";
  if (proposed === "supported" && (set.has("contradicted") || set.has("mixed"))) return computed;
  if (proposed === "contradicted" && !set.has("contradicted")) return computed;
  if (!set.has(proposed) && proposed !== "missing_context") return computed;
  return proposed;
}
