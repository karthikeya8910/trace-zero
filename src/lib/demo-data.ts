import type { InvestigationBundle, ReportContent } from "./domain";

/**
 * ILLUSTRATIVE DEMO DATA. Everything here is fictional: "Port Calder" and every publisher are invented
 * for demonstration. No URLs are provided because none of these sources exist.
 */
const INV = "demo-investigation";
const t = (min: number) => new Date(Date.UTC(2026, 10, 2, 9, 0, 0) + min * 1000).toISOString();

const claims: InvestigationBundle["claims"] = [
  {
    id: "demo-c1", investigation_id: INV, position: 0,
    claim_text: "Port Calder's city council voted unanimously (9–0) to stop adding fluoride to tap water.",
    original_text: "council voted 9-0 to ban fluoride", claim_type: "factual", is_verifiable: true,
    entities: ["Port Calder City Council"], dates: [], locations: ["Port Calder"], context: "Refers to the council meeting held in late October.",
    user_edited: false, assessment: "contradicted", confidence_level: "high", evidence_strength: "strong",
    explanation: "The illustrative council minutes record a 6–3 vote, and the illustrative Calder Gazette report gives the same tally. The motion approved a feasibility review, not an end to fluoridation. The '9–0' figure appears only in the social post that started the claim.",
    unresolved: ["Whether any council member has since changed position."], search_queries: [], created_at: t(10),
  },
  {
    id: "demo-c2", investigation_id: INV, position: 1,
    claim_text: "Fluoride will be removed from Port Calder tap water starting 1 March.",
    original_text: "no more fluoride from March 1st", claim_type: "factual", is_verifiable: true,
    entities: ["Regional Water Authority"], dates: ["1 March"], locations: ["Port Calder"], context: null,
    user_edited: true, assessment: "missing_context", confidence_level: "medium", evidence_strength: "moderate",
    explanation: "1 March is real, but it is the date the feasibility review begins. The illustrative Regional Water Authority bulletin says treatment can only change after its own approval process, which has no confirmed date.",
    unresolved: ["When the Regional Water Authority will rule.", "Whether the review will recommend any change."], search_queries: [], created_at: t(10),
  },
  {
    id: "demo-c3", investigation_id: INV, position: 2,
    claim_text: "The council acted because fluoride was officially found to be unsafe.",
    original_text: "because it's been proven unsafe", claim_type: "factual", is_verifiable: true,
    entities: ["Port Calder City Council", "Harbor Health Network"], dates: [], locations: [], context: null,
    user_edited: false, assessment: "unverified", confidence_level: "low", evidence_strength: "weak",
    explanation: "None of the illustrative official sources record a safety finding; the minutes list cost and public comments as the reasons. A local blog asserts a safety motive but cites no document. Without an official finding either way, the claim stays unverified. This does not mean it has been shown to be false.",
    unresolved: ["Whether any council member cited safety concerns outside the meeting."], search_queries: [], created_at: t(10),
  },
  {
    id: "demo-c4", investigation_id: INV, position: 3,
    claim_text: "This is the best decision the council has made in years.",
    original_text: null, claim_type: "opinion", is_verifiable: false, entities: [], dates: [], locations: [], context: null,
    user_edited: false, assessment: null, confidence_level: null, evidence_strength: null,
    explanation: "Not assessed: this is an opinion, not a verifiable factual statement.", unresolved: [], search_queries: [], created_at: t(10),
  },
];

const S = (id: string, title: string, publisher: string, date: string | null, type: string, excerpt: string, claim: string | null, status = "retrieved") => ({
  id, investigation_id: INV, discovered_for_claim_id: claim, title, url: null, publisher, publication_date: date,
  source_type: type, retrieval_status: status, excerpt, search_query: null, created_at: t(20),
});

const sources: InvestigationBundle["sources"] = [
  S("demo-s1", "Regular council meeting — minutes, item 7 (illustrative)", "Port Calder City Council (fictional)", "2026-10-28", "official",
    "Item 7: Motion to commission a feasibility review of municipal water fluoridation, citing treatment costs and public comment received. Carried 6–3. Review to commence 1 March. Any change to treatment remains subject to Regional Water Authority approval.", "demo-c1"),
  S("demo-s2", "Council orders fluoride review after split vote (illustrative)", "Calder Gazette (fictional)", "2026-10-29", "independent",
    "Councillors voted 6–3 on Tuesday to study whether the city should keep adding fluoride to its water. The mayor said the move was 'about cost, not safety'. No change will happen before the regional authority weighs in.", "demo-c1"),
  S("demo-s3", "Bulletin: fluoridation decisions and approval process (illustrative)", "Regional Water Authority (fictional)", "2026-10-30", "official",
    "Member councils may request reviews. Changes to treatment require an Authority determination following a public consultation of at least 90 days. No determination has been scheduled for Port Calder.", "demo-c2"),
  S("demo-s4", "Viral post: 'Port Calder bans fluoride 9–0' (illustrative)", "Social media post (fictional)", "2026-10-28", "other",
    "BREAKING: council voted 9-0 to ban fluoride!! no more fluoride from March 1st because it's been proven unsafe. Best decision in years.", null),
  S("demo-s5", "Explainer: what Port Calder's fluoride vote does and doesn't do (illustrative)", "Harbor Health Network (fictional)", "2026-10-31", "independent",
    "The review is a cost and community-preference study. It does not reflect any new safety finding; national guidance is unchanged. Residents' water will not change in March.", "demo-c3"),
  S("demo-s6", "Opinion: Calder finally listens on fluoride (illustrative)", "Calder Free Voice blog (fictional)", "2026-10-29", "other",
    "Everyone knows the real reason is safety, whatever they say officially. (No documents cited.)", "demo-c3", "snippet_only"),
];

const E = (id: string, claim: string, source: string, rel: string, summary: string, relevance: string, limitations: string, outdated = false) => ({
  id, investigation_id: INV, claim_id: claim, source_id: source, relationship_type: rel, summary, relevance, limitations, is_outdated: outdated, created_at: t(40),
});

const evidence: InvestigationBundle["evidence"] = [
  E("demo-e1", "demo-c1", "demo-s1", "contradicts", "Minutes record the motion carried 6–3, not 9–0, and that it commissions a review rather than ending fluoridation.", "Primary record of the vote itself.", "Illustrative record; minutes summarise rather than transcribe debate."),
  E("demo-e2", "demo-c1", "demo-s2", "contradicts", "Independent reporting gives the same 6–3 tally and describes a study, not a ban.", "Independent confirmation of the vote count.", "Secondary reporting; relies partly on council statements."),
  E("demo-e3", "demo-c1", "demo-s4", "supports", "The originating post asserts a 9–0 vote.", "Shows where the figure came from.", "Unsourced social post; the origin of the claim cannot verify itself."),
  E("demo-e4", "demo-c2", "demo-s1", "context", "1 March is the start date of the review; treatment changes need regional approval.", "Explains what the date actually refers to.", "Does not say when or whether treatment will change."),
  E("demo-e5", "demo-c2", "demo-s3", "context", "Any change requires an Authority determination after a 90-day consultation; none is scheduled.", "Establishes that a 1 March removal is not possible under the stated process.", "General process bulletin; not specific to a final outcome."),
  E("demo-e6", "demo-c2", "demo-s5", "contradicts", "States residents' water will not change in March.", "Directly addresses the timing.", "Explainer from an independent group; not an official decision."),
  E("demo-e7", "demo-c3", "demo-s1", "neutral", "Minutes cite cost and public comment; they do not mention safety findings.", "Shows the officially recorded reasons.", "Silence on safety is not proof that safety played no role."),
  E("demo-e8", "demo-c3", "demo-s5", "contradicts", "Says the review reflects no new safety finding and guidance is unchanged.", "Addresses the safety rationale directly.", "Independent explainer, not a council statement."),
  E("demo-e9", "demo-c3", "demo-s6", "supports", "Asserts safety is the 'real reason' without citing documents.", "Represents the claim's supporting viewpoint.", "Opinion blog, snippet only, no evidence offered."),
];

const ev = (id: string, min: number, stage: string, type: string, description: string, metadata: Record<string, unknown> = {}) => ({
  id, investigation_id: INV, stage, event_type: type, description, metadata: metadata as never, created_at: t(min),
});

const events: InvestigationBundle["events"] = [
  ev("demo-ev1", 0, "intake", "intake.received", "Received 214 characters of text (illustrative submission)."),
  ev("demo-ev2", 8, "deconstruct", "deconstruct.complete", "Identified 4 statements, 3 verifiable.", { counts: { factual: 3, opinion: 1 } }),
  ev("demo-ev3", 15, "review", "review.confirmed", "You confirmed 4 claims (1 edited, 0 added, 0 removed)."),
  ev("demo-ev4", 18, "discover", "discover.query", 'Searched: "Port Calder council fluoride vote minutes" — 3 results.', { claim_id: "demo-c1" }),
  ev("demo-ev5", 19, "discover", "discover.source_added", 'Found Port Calder City Council (fictional): "Regular council meeting — minutes, item 7"', { source_id: "demo-s1", claim_id: "demo-c1" }),
  ev("demo-ev6", 20, "discover", "discover.source_added", 'Found Calder Gazette (fictional): "Council orders fluoride review after split vote"', { source_id: "demo-s2", claim_id: "demo-c1" }),
  ev("demo-ev7", 21, "discover", "discover.source_added", 'Found Social media post (fictional): "Viral post: Port Calder bans fluoride 9–0"', { source_id: "demo-s4" }),
  ev("demo-ev8", 26, "discover", "discover.query", 'Searched: "Regional Water Authority fluoridation approval process" — 2 results.', { claim_id: "demo-c2" }),
  ev("demo-ev9", 27, "discover", "discover.source_added", 'Found Regional Water Authority (fictional): "Bulletin: fluoridation decisions and approval process"', { source_id: "demo-s3", claim_id: "demo-c2" }),
  ev("demo-ev10", 33, "discover", "discover.query", 'Searched: "Port Calder fluoride safety finding" — 2 results.', { claim_id: "demo-c3" }),
  ev("demo-ev11", 34, "discover", "discover.source_added", 'Found Harbor Health Network (fictional): "Explainer: what the fluoride vote does and doesn\'t do"', { source_id: "demo-s5", claim_id: "demo-c3" }),
  ev("demo-ev12", 35, "discover", "discover.source_added", 'Found Calder Free Voice blog (fictional): "Opinion: Calder finally listens on fluoride"', { source_id: "demo-s6", claim_id: "demo-c3" }),
  ev("demo-ev13", 44, "examine", "examine.claim_assessed", "Claim 1 assessed as CONTRADICTED from 3 evidence links.", { claim_id: "demo-c1", assessment: "contradicted" }),
  ev("demo-ev14", 45, "examine", "examine.contradiction", "Contradiction: Port Calder City Council (fictional) conflicts with claim 1.", { claim_id: "demo-c1", source_id: "demo-s1" }),
  ev("demo-ev15", 46, "examine", "examine.conflict", "Sources disagree on claim 1: 1 support, 2 contradict.", { claim_id: "demo-c1" }),
  ev("demo-ev16", 52, "examine", "examine.claim_assessed", "Claim 2 assessed as MISSING CONTEXT from 3 evidence links.", { claim_id: "demo-c2", assessment: "missing_context" }),
  ev("demo-ev17", 58, "examine", "examine.claim_assessed", "Claim 3 assessed as UNVERIFIED from 3 evidence links.", { claim_id: "demo-c3", assessment: "unverified" }),
  ev("demo-ev18", 59, "examine", "examine.claim_skipped", "Skipped an opinion statement — not independently verifiable.", { claim_id: "demo-c4" }),
  ev("demo-ev19", 66, "conclude", "conclude.complete", "Final assessment: MIXED with medium confidence."),
];

const reportContent: ReportContent = {
  summary: "The viral post gets the vote count wrong, misdescribes what the 1 March date means, and gives a safety motive that no official source records. The council did vote to review fluoridation.",
  reasoning: "The council minutes [src:demo-s1] and independent reporting [src:demo-s2] both record a 6–3 vote to commission a review, which contradicts the '9–0 ban'. The Regional Water Authority bulletin [src:demo-s3] shows treatment cannot change without its own determination, so 1 March is the start of the review, not a removal date. No official source records a safety finding. One independent explainer [src:demo-s5] says there was none, but because no official statement settles the motive, that claim stays unverified.",
  known: [
    "The council voted 6–3 to commission a feasibility review [src:demo-s1].",
    "The review begins on 1 March [src:demo-s1].",
    "Treatment changes require a Regional Water Authority determination after public consultation [src:demo-s3].",
  ],
  unknown: ["Whether the review will recommend any change.", "When the Regional Water Authority will rule.", "Whether any councillor privately cited safety."],
  limitations: "Illustrative demonstration only: every source and publisher is fictional and no live research was performed for this sample.",
  timeline: [
    { date: "2026-10-28", event: "Council votes 6–3 to commission a fluoridation review.", source_id: "demo-s1" },
    { date: "2026-10-28", event: "A social post claiming a '9–0 ban' begins circulating.", source_id: "demo-s4" },
    { date: "2026-10-29", event: "Calder Gazette reports the split vote.", source_id: "demo-s2" },
    { date: "2026-10-30", event: "Regional Water Authority restates its approval process.", source_id: "demo-s3" },
    { date: "2026-10-31", event: "Harbor Health Network publishes an explainer.", source_id: "demo-s5" },
  ],
  generated_at: t(66),
  model: "illustrative",
  research_mode: "illustrative",
  illustrative: true,
};

export const DEMO_BUNDLE: InvestigationBundle = {
  mode: "demo",
  investigation: {
    id: INV,
    user_id: "demo",
    title: "Did Port Calder ban fluoride in a 9–0 vote?",
    input_type: "text",
    original_content:
      "BREAKING: Port Calder council voted 9-0 to ban fluoride!! No more fluoride from March 1st because it's been proven unsafe. Best decision the council has made in years. Share before they delete this.",
    source_url: null,
    uploaded_file_path: null,
    extracted_text: null,
    status: "completed",
    stage_cursor: 0,
    lock_until: null,
    error_message: null,
    failed_stage: null,
    research_mode: "live",
    overall_assessment: "mixed",
    confidence_level: "medium",
    summary: reportContent.summary ?? null,
    limitations: reportContent.limitations ?? null,
    is_saved: true,
    created_at: t(0),
    updated_at: t(66),
  },
  claims,
  sources,
  evidence,
  events,
  report: { id: "demo-report", investigation_id: INV, report_content: reportContent as never, is_public: false, public_token: null, published_at: null, created_at: t(66), updated_at: t(66) },
};
