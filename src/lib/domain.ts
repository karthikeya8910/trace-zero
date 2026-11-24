import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type InvestigationRow = Tables["investigations"]["Row"];
export type ClaimRow = Tables["claims"]["Row"];
export type SourceRow = Tables["sources"]["Row"];
export type EvidenceRow = Tables["evidence"]["Row"];
export type EventRow = Tables["investigation_events"]["Row"];
export type ReportRow = Tables["reports"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];

export const ASSESSMENTS = ["supported", "contradicted", "mixed", "unverified", "missing_context"] as const;
export type Assessment = (typeof ASSESSMENTS)[number];

export const CONFIDENCE = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const EVIDENCE_STRENGTH = ["none", "weak", "moderate", "strong"] as const;
export type EvidenceStrength = (typeof EVIDENCE_STRENGTH)[number];

export const CLAIM_TYPES = ["factual", "opinion", "prediction", "question", "subjective"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const RELATIONSHIPS = ["supports", "contradicts", "context", "neutral"] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const SOURCE_TYPES = ["official", "primary", "independent", "reference", "submitted", "other"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const PROCESSING_STATUSES = ["deconstructing", "discovering", "examining", "concluding"] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];
export type InvestigationStatus =
  | ProcessingStatus
  | "awaiting_review"
  | "completed"
  | "failed"
  | "cancelled";

export function isProcessing(status: string): status is ProcessingStatus {
  return (PROCESSING_STATUSES as readonly string[]).includes(status);
}

export interface ReportContent {
  summary?: string;
  reasoning?: string;
  known?: string[];
  unknown?: string[];
  limitations?: string;
  timeline?: { date: string; event: string; source_id?: string | null }[];
  generated_at?: string;
  model?: string;
  research_mode?: string;
  illustrative?: boolean;
}

/** Everything needed to render an investigation, from the database, a public link or the demo. */
export interface InvestigationBundle {
  investigation: InvestigationRow;
  claims: ClaimRow[];
  sources: SourceRow[];
  evidence: EvidenceRow[];
  events: EventRow[];
  report: ReportRow | null;
  mode: "owner" | "demo" | "public";
}

export const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  factual: "Factual claim",
  opinion: "Opinion",
  prediction: "Prediction",
  question: "Question",
  subjective: "Subjective statement",
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  official: "Official",
  primary: "Primary source",
  independent: "Independent reporting",
  reference: "Reference",
  submitted: "Submitted page",
  other: "Other",
};

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  context: "Adds context",
  neutral: "Neutral / unresolved",
};

export const STAGES = [
  { key: "deconstructing", title: "Deconstruct", line: "Deconstructing your submission" },
  { key: "discovering", title: "Discover", line: "Discovering relevant sources" },
  { key: "examining", title: "Examine", line: "Examining evidence" },
  { key: "concluding", title: "Conclude", line: "Preparing your assessment" },
] as const;
