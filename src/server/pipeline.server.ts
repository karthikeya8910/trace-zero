import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { Assessment, ClaimRow, Confidence, InvestigationRow, Relationship, ReportContent, SourceRow } from "@/lib/domain";
import { ASSESSMENTS, CLAIM_TYPES, CONFIDENCE, EVIDENCE_STRENGTH } from "@/lib/domain";
import { deriveOverallAssessment, reconcileClaimAssessment } from "@/lib/integrity";
import { normalizeUrl } from "@/lib/url-safety";
import { AI_MODEL, geminiJson } from "./ai.server";
import { searchProvider, webSearch, SearchError } from "./search.server";
import { fetchPublicPage, PageFetchError } from "./fetch-page.server";

type Admin = SupabaseClient<Database>;
type Stage = "intake" | "deconstruct" | "review" | "discover" | "examine" | "conclude" | "system";

export class StepError extends Error {}

export async function logEvent(admin: Admin, investigationId: string, stage: Stage, eventType: string, description: string, metadata: Record<string, unknown> = {}) {
  await admin.from("investigation_events").insert({
    investigation_id: investigationId,
    stage,
    event_type: eventType,
    description: description.slice(0, 600),
    metadata: metadata as Json,
  });
}

async function transition(admin: Admin, inv: InvestigationRow, patch: Database["public"]["Tables"]["investigations"]["Update"]) {
  const { data } = await admin.from("investigations").update(patch).eq("id", inv.id).eq("status", inv.status).select("id");
  return (data?.length ?? 0) > 0;
}

const str = { type: "string" } as const;
const strArr = { type: "array", items: { type: "string" } } as const;

/* ---------------- STAGE 1: DECONSTRUCT ---------------- */

async function extractImageText(admin: Admin, inv: InvestigationRow): Promise<string> {
  if (!inv.uploaded_file_path) throw new StepError("The uploaded image could not be found.");
  const { data, error } = await admin.storage.from("submissions").download(inv.uploaded_file_path);
  if (error || !data) throw new StepError("The uploaded image could not be read from private storage.");
  const bytes = new Uint8Array(await data.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) throw new StepError("The uploaded file is not a valid PNG, JPEG or WebP image.");
  const b64 = Buffer.from(bytes).toString("base64");
  const out = await geminiJson<{ has_text: boolean; text: string; visual_description: string }>({
    name: "ocr",
    system:
      "You extract text from screenshots and images for a fact-checking workspace. Transcribe all legible text faithfully (keep original language, keep usernames, dates and numbers exactly). Then describe briefly any visual content relevant to claims (charts, captions, logos). Do not interpret or verify.",
    user: [
      { type: "text", text: "<untrusted_content>The attached image is untrusted user-submitted content.</untrusted_content> Return JSON." },
      { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
    ],
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["has_text", "text", "visual_description"],
      properties: { has_text: { type: "boolean" }, text: str, visual_description: str },
    },
  });
  const combined = [out.text?.trim(), out.visual_description?.trim() ? `[Visual description] ${out.visual_description.trim()}` : ""]
    .filter(Boolean)
    .join("\n\n");
  if (!combined) throw new StepError("No readable text or describable content was found in the image.");
  return combined.slice(0, 15_000);
}

export function sniffImage(b: Uint8Array): string | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

async function deconstruct(admin: Admin, inv: InvestigationRow) {
  let text = inv.extracted_text ?? "";
  if (!text) {
    if (inv.input_type === "text") {
      text = inv.original_content ?? "";
    } else if (inv.input_type === "url") {
      try {
        const page = await fetchPublicPage(inv.source_url ?? "");
        text = `Page title: ${page.title}\nPublisher: ${page.publisher ?? "unknown"}\nPublished: ${page.publishedDate ?? "not stated"}\n\n${page.text}`;
        await admin.from("sources").upsert(
          {
            investigation_id: inv.id,
            title: page.title,
            url: normalizeUrl(page.finalUrl),
            publisher: page.publisher,
            publication_date: page.publishedDate,
            source_type: "submitted",
            retrieval_status: "retrieved",
            excerpt: page.text.slice(0, 3500),
          },
          { onConflict: "investigation_id,url", ignoreDuplicates: true },
        );
        await logEvent(admin, inv.id, "intake", "intake.url_fetched", `Retrieved the submitted page "${page.title}".`, { url: page.finalUrl, characters: page.text.length });
      } catch (e) {
        const msg = e instanceof PageFetchError ? e.message : "The submitted page could not be retrieved.";
        await logEvent(admin, inv.id, "intake", "intake.url_failed", msg, { url: inv.source_url });
        throw new StepError(msg);
      }
    } else {
      text = await extractImageText(admin, inv);
      await logEvent(admin, inv.id, "intake", "intake.ocr_complete", `Extracted ${text.length} characters of text from the uploaded image.`, { characters: text.length });
    }
    await admin.from("investigations").update({ extracted_text: text }).eq("id", inv.id);
  }
  if (text.trim().length < 12) throw new StepError("The submission is too short to contain an investigable claim.");

  const out = await geminiJson<{
    title: string;
    claims: {
      text: string;
      original_excerpt: string;
      type: string;
      is_verifiable: boolean;
      entities: string[];
      dates: string[];
      locations: string[];
      context: string;
      search_queries: string[];
    }[];
  }>({
    name: "deconstruct",
    system: `You are the DECONSTRUCT stage of TRACE//ZERO, a digital investigation workspace.
Split the submission into individual, self-contained claims (max 8). Rewrite each claim so it stands alone (resolve pronouns) without changing its meaning.
Classify each as exactly one of: factual (a checkable statement about the world), opinion, prediction, question, subjective.
Only factual claims are verifiable (is_verifiable=true). Opinions, predictions, questions and subjective statements are not verifiable (false).
Do NOT treat every sentence as a factual claim. Skip greetings, calls to action and filler.
Extract entities, dates, locations and relevant context present in the text (never invent any).
For each verifiable claim write 2 concise web-search queries aimed at primary/official sources and independent reporting.
Also produce a short neutral investigation title (max 70 chars) that does not take a position.`,
    user: `<submission>\n${text.slice(0, 15_000)}\n</submission>`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "claims"],
      properties: {
        title: str,
        claims: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["text", "original_excerpt", "type", "is_verifiable", "entities", "dates", "locations", "context", "search_queries"],
            properties: {
              text: str,
              original_excerpt: str,
              type: { type: "string", enum: [...CLAIM_TYPES] },
              is_verifiable: { type: "boolean" },
              entities: strArr,
              dates: strArr,
              locations: strArr,
              context: str,
              search_queries: strArr,
            },
          },
        },
      },
    },
  });

  const claims = (out.claims ?? [])
    .filter((c) => c.text && c.text.trim().length >= 3)
    .slice(0, 8)
    .map((c, i) => {
      const type = (CLAIM_TYPES as readonly string[]).includes(c.type) ? c.type : "factual";
      return {
        investigation_id: inv.id,
        position: i,
        claim_text: c.text.trim().slice(0, 1000),
        original_text: c.original_excerpt?.slice(0, 1000) || null,
        claim_type: type,
        is_verifiable: type === "factual" ? c.is_verifiable !== false : false,
        entities: (c.entities ?? []).slice(0, 12) as Json,
        dates: (c.dates ?? []).slice(0, 8) as Json,
        locations: (c.locations ?? []).slice(0, 8) as Json,
        context: c.context?.slice(0, 600) || null,
        search_queries: (c.search_queries ?? []).filter(Boolean).slice(0, 3).map((q) => q.slice(0, 200)) as Json,
      };
    });

  await admin.from("claims").delete().eq("investigation_id", inv.id);
  if (claims.length) {
    const { error } = await admin.from("claims").insert(claims);
    if (error) throw new StepError("Extracted claims could not be saved.");
  }
  const counts = claims.reduce<Record<string, number>>((m, c) => ((m[c.claim_type] = (m[c.claim_type] ?? 0) + 1), m), {});
  await logEvent(
    admin,
    inv.id,
    "deconstruct",
    "deconstruct.complete",
    claims.length
      ? `Identified ${claims.length} statement${claims.length === 1 ? "" : "s"}, ${claims.filter((c) => c.is_verifiable).length} verifiable.`
      : "No distinct claims were identified. You can add claims manually.",
    { counts, model: AI_MODEL },
  );
  const patch: Database["public"]["Tables"]["investigations"]["Update"] = { status: "awaiting_review", stage_cursor: 0 };
  if (inv.title === "Untitled investigation" && out.title) patch.title = out.title.slice(0, 120);
  await transition(admin, inv, patch);
}

/* ---------------- STAGE 2: DISCOVER ---------------- */

async function discoverStep(admin: Admin, inv: InvestigationRow) {
  const { data: claims } = await admin
    .from("claims")
    .select("*")
    .eq("investigation_id", inv.id)
    .eq("is_verifiable", true)
    .order("position");
  const list = claims ?? [];
  const provider = searchProvider();

  if (inv.stage_cursor === 0 && inv.research_mode === "pending") {
    if (!provider) {
      await admin.from("investigations").update({ research_mode: "unavailable" }).eq("id", inv.id);
      await logEvent(admin, inv.id, "discover", "discover.provider_unavailable", "No web-search provider is configured, so no live research was performed. Findings will be marked unverified.");
      await transition(admin, inv, { status: "examining", stage_cursor: 0, research_mode: "unavailable" });
      return;
    }
    await admin.from("investigations").update({ research_mode: "live" }).eq("id", inv.id);
    inv.research_mode = "live";
  }
  if (inv.research_mode === "unavailable" || inv.stage_cursor >= list.length) {
    await transition(admin, inv, { status: "examining", stage_cursor: 0 });
    return;
  }

  const claim = list[inv.stage_cursor]!;
  const queries = ((claim.search_queries as string[] | null) ?? []).filter(Boolean);
  if (!queries.length) queries.push(claim.claim_text.slice(0, 200));
  let added = 0;
  let failures = 0;
  let lastError = "";
  for (const query of queries.slice(0, 2)) {
    try {
      const hits = await webSearch(query, 5);
      await logEvent(admin, inv.id, "discover", "discover.query", `Searched: "${query}" — ${hits.length} result${hits.length === 1 ? "" : "s"}.`, { query, results: hits.length, claim_id: claim.id, provider });
      for (const h of hits) {
        if (added >= 6) break;
        const { data: ins } = await admin
          .from("sources")
          .upsert(
            {
              investigation_id: inv.id,
              discovered_for_claim_id: claim.id,
              title: h.title.slice(0, 300),
              url: normalizeUrl(h.url),
              publisher: h.publisher?.slice(0, 120) ?? null,
              publication_date: h.publishedDate?.slice(0, 40) ?? null,
              source_type: h.sourceType,
              retrieval_status: h.content.length < 40 ? "inaccessible" : h.fullContent ? "retrieved" : "snippet_only",
              excerpt: h.content || null,
              search_query: query,
            },
            { onConflict: "investigation_id,url", ignoreDuplicates: true },
          )
          .select("id");
        if (ins?.length) {
          added++;
          await logEvent(admin, inv.id, "discover", "discover.source_added", `Found ${h.publisher ?? "a source"}: "${h.title.slice(0, 140)}"`, {
            source_id: ins[0]!.id,
            url: h.url,
            claim_id: claim.id,
            source_type: h.sourceType,
          });
        }
      }
    } catch (e) {
      failures++;
      lastError = e instanceof SearchError ? e.message : "Web search request failed.";
      await logEvent(admin, inv.id, "discover", "discover.query_failed", `Search failed for "${query}": ${lastError}`, { query, claim_id: claim.id });
    }
  }
  if (failures >= Math.min(2, queries.length)) throw new StepError(lastError || "Web search failed for this claim.");
  await transition(admin, inv, { stage_cursor: inv.stage_cursor + 1 });
}

/* ---------------- STAGE 3: EXAMINE ---------------- */

async function examineStep(admin: Admin, inv: InvestigationRow) {
  const { data: claims } = await admin.from("claims").select("*").eq("investigation_id", inv.id).order("position");
  const list = claims ?? [];
  if (inv.stage_cursor >= list.length) {
    await transition(admin, inv, { status: "concluding", stage_cursor: 0 });
    return;
  }
  const claim = list[inv.stage_cursor]!;
  if (!claim.is_verifiable) {
    await admin
      .from("claims")
      .update({
        assessment: null,
        confidence_level: null,
        evidence_strength: null,
        explanation: `Not assessed: this is classified as ${claim.claim_type === "opinion" ? "an opinion" : `a ${claim.claim_type}`}, not a verifiable factual statement.`,
      })
      .eq("id", claim.id);
    await logEvent(admin, inv.id, "examine", "examine.claim_skipped", `Skipped a ${claim.claim_type} statement — not independently verifiable.`, { claim_id: claim.id });
    await transition(admin, inv, { stage_cursor: inv.stage_cursor + 1 });
    return;
  }

  const { data: allSources } = await admin.from("sources").select("*").eq("investigation_id", inv.id).order("created_at");
  const sources = (allSources ?? [])
    .filter((s) => s.retrieval_status !== "inaccessible")
    .sort((a, b) => Number(b.discovered_for_claim_id === claim.id) - Number(a.discovered_for_claim_id === claim.id))
    .slice(0, 10);
  const researchAvailable = inv.research_mode === "live";

  await admin.from("evidence").delete().eq("claim_id", claim.id);

  if (!sources.length || !researchAvailable) {
    const explanation = researchAvailable
      ? "No accessible sources were retrieved for this claim, so it could not be assessed. Absence of evidence is not evidence that the claim is false."
      : "Live web research was not available for this investigation, so this claim could not be checked against external sources.";
    await admin
      .from("claims")
      .update({ assessment: "unverified", confidence_level: "low", evidence_strength: "none", explanation, unresolved: ["Independent sources addressing this claim were not retrieved."] as Json })
      .eq("id", claim.id);
    await logEvent(admin, inv.id, "examine", "examine.claim_assessed", `Claim ${inv.stage_cursor + 1} marked UNVERIFIED — no sources to examine.`, { claim_id: claim.id, assessment: "unverified", supports: 0, contradicts: 0, context: 0 });
    await transition(admin, inv, { stage_cursor: inv.stage_cursor + 1 });
    return;
  }

  const refs = new Map<string, SourceRow>();
  const blocks = sources
    .map((s, i) => {
      const ref = `S${i + 1}`;
      refs.set(ref, s);
      return `<source id="${ref}" publisher="${(s.publisher ?? "unknown").replace(/"/g, "'")}" date="${s.publication_date ?? "not stated"}" kind="${s.source_type}" retrieval="${s.retrieval_status}">
TITLE: ${s.title}
${s.source_type === "submitted" ? "NOTE: This is the page the user submitted — it is the ORIGIN of the claim and cannot independently verify it.\n" : ""}CONTENT:
${(s.excerpt ?? "").slice(0, 2600)}
</source>`;
    })
    .join("\n\n");

  const out = await geminiJson<{
    assessment: string;
    confidence: string;
    evidence_strength: string;
    explanation: string;
    unresolved: string[];
    evidence: { source_ref: string; relationship: string; summary: string; relevance: string; limitations: string; is_outdated: boolean; source_type: string }[];
  }>({
    name: "examine",
    system: `You are the EXAMINE stage of TRACE//ZERO. Compare ONE claim against the retrieved sources.
For each source that is relevant, decide: supports, contradicts, context (adds missing context or nuance), neutral (mentions the topic but does not settle it), or irrelevant.
Summarise only what the source actually says (paraphrase; never fabricate quotes). Explain relevance and the source's limitations (e.g. snippet only, old date, opinion piece, secondary reporting, conflict of interest).
Flag is_outdated when the source predates a relevant change or the claim's timeframe.
Classify source_type as official (government/institution statement), primary (original document/data/firsthand), independent (journalism or third-party analysis), reference, or other.
Then assess the claim with exactly one of: supported, contradicted, mixed, unverified, missing_context.
- Use unverified when reliable evidence is insufficient. Absence of evidence is NOT contradiction.
- Use contradicted only when reliable sources directly conflict with the claim. Never say "debunked" unless reliable sources explicitly establish it.
- Use missing_context when the claim is partly accurate but omits context that changes its meaning.
- Do not declare a source unreliable merely because it disagrees with another source.
Confidence (low/medium/high) reflects source quality, independence and agreement — not certainty theatre. evidence_strength: none/weak/moderate/strong.
List unresolved questions that remain open.`,
    user: `<untrusted_content>
CLAIM: ${claim.claim_text}
CONTEXT: ${claim.context ?? "none"}
${blocks}
</untrusted_content>`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["assessment", "confidence", "evidence_strength", "explanation", "unresolved", "evidence"],
      properties: {
        assessment: { type: "string", enum: [...ASSESSMENTS] },
        confidence: { type: "string", enum: [...CONFIDENCE] },
        evidence_strength: { type: "string", enum: [...EVIDENCE_STRENGTH] },
        explanation: str,
        unresolved: strArr,
        evidence: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["source_ref", "relationship", "summary", "relevance", "limitations", "is_outdated", "source_type"],
            properties: {
              source_ref: str,
              relationship: { type: "string", enum: ["supports", "contradicts", "context", "neutral", "irrelevant"] },
              summary: str,
              relevance: str,
              limitations: str,
              is_outdated: { type: "boolean" },
              source_type: { type: "string", enum: ["official", "primary", "independent", "reference", "other"] },
            },
          },
        },
      },
    },
  });

  // Keep only evidence that references a real retrieved source (no invented citations).
  const rows: Database["public"]["Tables"]["evidence"]["Insert"][] = [];
  const seen = new Set<string>();
  const countedRelationships: Relationship[] = [];
  const countedSources = new Set<string>();
  for (const e of out.evidence ?? []) {
    const src = refs.get(e.source_ref?.trim());
    if (!src || e.relationship === "irrelevant" || seen.has(src.id)) continue;
    if (!["supports", "contradicts", "context", "neutral"].includes(e.relationship)) continue;
    seen.add(src.id);
    rows.push({
      investigation_id: inv.id,
      claim_id: claim.id,
      source_id: src.id,
      relationship_type: e.relationship,
      summary: (e.summary || "No summary provided.").slice(0, 1200),
      relevance: e.relevance?.slice(0, 800) || null,
      limitations: e.limitations?.slice(0, 800) || null,
      is_outdated: Boolean(e.is_outdated),
    });
    if (src.source_type !== "submitted") {
      countedRelationships.push(e.relationship as Relationship);
      countedSources.add(src.id);
      if (["official", "primary"].includes(e.source_type) && src.source_type !== e.source_type && src.source_type !== "official") {
        await admin.from("sources").update({ source_type: e.source_type }).eq("id", src.id);
      }
    }
  }
  if (rows.length) await admin.from("evidence").insert(rows);

  const proposed = ((ASSESSMENTS as readonly string[]).includes(out.assessment) ? out.assessment : "unverified") as Assessment;
  const conf = ((CONFIDENCE as readonly string[]).includes(out.confidence) ? out.confidence : "low") as Confidence;
  const rec = reconcileClaimAssessment({ proposed, confidence: conf, relationships: countedRelationships, distinctSources: countedSources.size, researchAvailable });
  const explanation = rec.downgraded
    ? `${out.explanation}\n\nIntegrity check: the proposed verdict "${proposed}" was not backed by enough stored independent evidence, so this claim is recorded as unverified.`
    : out.explanation;
  await admin
    .from("claims")
    .update({
      assessment: rec.assessment,
      confidence_level: rec.confidence,
      evidence_strength: rec.assessment === "unverified" && countedSources.size === 0 ? "none" : (EVIDENCE_STRENGTH as readonly string[]).includes(out.evidence_strength) ? out.evidence_strength : "weak",
      explanation: explanation.slice(0, 3000),
      unresolved: (out.unresolved ?? []).slice(0, 6) as Json,
    })
    .eq("id", claim.id);

  const tally = { supports: 0, contradicts: 0, context: 0, neutral: 0 };
  for (const r of rows) tally[r.relationship_type as keyof typeof tally]++;
  await logEvent(admin, inv.id, "examine", "examine.claim_assessed", `Claim ${inv.stage_cursor + 1} assessed as ${rec.assessment.replace("_", " ").toUpperCase()} from ${rows.length} evidence link${rows.length === 1 ? "" : "s"}.`, {
    claim_id: claim.id,
    assessment: rec.assessment,
    confidence: rec.confidence,
    ...tally,
  });
  for (const r of rows.filter((r) => r.relationship_type === "contradicts")) {
    const src = sources.find((s) => s.id === r.source_id);
    await logEvent(admin, inv.id, "examine", "examine.contradiction", `Contradiction: ${src?.publisher ?? "a source"} conflicts with claim ${inv.stage_cursor + 1}.`, { claim_id: claim.id, source_id: r.source_id });
  }
  if (tally.supports > 0 && tally.contradicts > 0) {
    await logEvent(admin, inv.id, "examine", "examine.conflict", `Sources disagree on claim ${inv.stage_cursor + 1}: ${tally.supports} support, ${tally.contradicts} contradict.`, { claim_id: claim.id });
  }
  if (rec.downgraded) {
    await logEvent(admin, inv.id, "examine", "examine.integrity_downgrade", `Integrity check downgraded claim ${inv.stage_cursor + 1} from ${proposed} to unverified.`, { claim_id: claim.id, proposed });
  }
  await transition(admin, inv, { stage_cursor: inv.stage_cursor + 1 });
}

/* ---------------- STAGE 4: CONCLUDE ---------------- */

async function conclude(admin: Admin, inv: InvestigationRow) {
  const [{ data: claims }, { data: sources }, { data: evidence }] = await Promise.all([
    admin.from("claims").select("*").eq("investigation_id", inv.id).order("position"),
    admin.from("sources").select("*").eq("investigation_id", inv.id),
    admin.from("evidence").select("*").eq("investigation_id", inv.id),
  ]);
  const cl = (claims ?? []) as ClaimRow[];
  const src = sources ?? [];
  const ev = evidence ?? [];
  const verifiable = cl.filter((c) => c.is_verifiable && c.assessment);
  const refs = new Map<string, string>();
  src.forEach((s, i) => refs.set(`S${i + 1}`, s.id));
  const refOf = (id: string) => [...refs.entries()].find(([, v]) => v === id)?.[0] ?? "?";

  const brief = cl
    .map((c, i) => {
      const lines = ev
        .filter((e) => e.claim_id === c.id)
        .map((e) => {
          const s = src.find((x) => x.id === e.source_id);
          return `  - [${refOf(e.source_id)}] ${e.relationship_type} — ${s?.publisher ?? "?"} (${s?.publication_date ?? "date not stated"}): ${e.summary}`;
        })
        .join("\n");
      return `CLAIM ${i + 1} (${c.claim_type}${c.is_verifiable ? "" : ", not verifiable"}) — verdict: ${c.assessment ?? "not assessed"}, confidence: ${c.confidence_level ?? "n/a"}
${c.claim_text}
Reasoning: ${c.explanation ?? ""}
Evidence:
${lines || "  (none)"}`;
    })
    .join("\n\n");

  const out = await geminiJson<{
    overall_assessment: string;
    confidence: string;
    summary: string;
    reasoning: string;
    known: string[];
    unknown: string[];
    limitations: string;
    timeline: { date: string; event: string; source_ref: string }[];
  }>({
    name: "conclude",
    system: `You are the CONCLUDE stage of TRACE//ZERO. Write the final structured assessment from the per-claim findings below.
Overall assessment: one of supported, contradicted, mixed, unverified, missing_context — consistent with the claim verdicts.
Summary: 2-3 neutral sentences. Reasoning: explain how the evidence leads to the verdict, citing sources as [S#].
known: facts established by cited evidence (each with [S#]). unknown: what remains unresolved.
limitations: honest research limitations (coverage, dates, snippet-only sources, language).
timeline: dated events that appear in the evidence (only dates stated in sources; source_ref must be an S# from the evidence; leave empty if none).
Never introduce facts that are not in the evidence. Never call something debunked unless the evidence explicitly establishes it.`,
    user: `<untrusted_content>\nResearch mode: ${inv.research_mode}\n${brief}\n</untrusted_content>`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["overall_assessment", "confidence", "summary", "reasoning", "known", "unknown", "limitations", "timeline"],
      properties: {
        overall_assessment: { type: "string", enum: [...ASSESSMENTS] },
        confidence: { type: "string", enum: [...CONFIDENCE] },
        summary: str,
        reasoning: str,
        known: strArr,
        unknown: strArr,
        limitations: str,
        timeline: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["date", "event", "source_ref"], properties: { date: str, event: str, source_ref: str } },
        },
      },
    },
  });

  const proposed = ((ASSESSMENTS as readonly string[]).includes(out.overall_assessment) ? out.overall_assessment : null) as Assessment | null;
  const overall = deriveOverallAssessment(verifiable.map((c) => c.assessment as Assessment), proposed);
  let confidence = ((CONFIDENCE as readonly string[]).includes(out.confidence) ? out.confidence : "low") as Confidence;
  if (overall === "unverified" || inv.research_mode !== "live") confidence = "low";

  const sysLimits: string[] = [];
  if (inv.research_mode !== "live") sysLimits.push("No live web research was performed because a search provider was not configured.");
  const snippet = src.filter((s) => s.retrieval_status === "snippet_only").length;
  const inacc = src.filter((s) => s.retrieval_status === "inaccessible").length;
  if (snippet) sysLimits.push(`${snippet} source${snippet === 1 ? " was" : "s were"} assessed from a search snippet rather than full text.`);
  if (inacc) sysLimits.push(`${inacc} source${inacc === 1 ? " was" : "s were"} inaccessible and excluded.`);
  if (!verifiable.length) sysLimits.push("The submission contained no verifiable factual claims.");
  const limitations = [out.limitations, ...sysLimits].filter(Boolean).join(" ");

  const report: ReportContent = {
    summary: out.summary,
    reasoning: out.reasoning,
    known: (out.known ?? []).slice(0, 12),
    unknown: (out.unknown ?? []).slice(0, 12),
    limitations,
    timeline: (out.timeline ?? [])
      .filter((t) => t.date && t.event)
      .slice(0, 14)
      .map((t) => ({ date: t.date.slice(0, 40), event: t.event.slice(0, 300), source_id: refs.get(t.source_ref?.trim()) ?? null }))
      .filter((t) => t.source_id),
    generated_at: new Date().toISOString(),
    model: AI_MODEL,
    research_mode: inv.research_mode,
  };
  // Replace [S#] markers with stable source ids so citations survive re-ordering.
  const cite = (s: string) => s.replace(/\[S(\d+)\]/g, (m, n: string) => (refs.get(`S${n}`) ? `[src:${refs.get(`S${n}`)}]` : ""));
  report.reasoning = cite(report.reasoning ?? "");
  report.known = (report.known ?? []).map(cite);

  await admin.from("reports").upsert({ investigation_id: inv.id, report_content: report as unknown as Json }, { onConflict: "investigation_id" });
  const ok = await transition(admin, inv, {
    status: "completed",
    overall_assessment: overall,
    confidence_level: confidence,
    summary: out.summary?.slice(0, 1200) ?? null,
    limitations: limitations.slice(0, 3000),
    lock_until: null,
    failed_stage: null,
    error_message: null,
  });
  if (ok) {
    await logEvent(admin, inv.id, "conclude", "conclude.complete", `Final assessment: ${overall.replace("_", " ").toUpperCase()} with ${confidence} confidence.`, { overall, confidence, sources: src.length, evidence: ev.length });
  }
}

/* ---------------- ORCHESTRATION ---------------- */

const STAGE_OF: Record<string, Stage> = { deconstructing: "deconstruct", discovering: "discover", examining: "examine", concluding: "conclude" };

/** Runs exactly one unit of work for the investigation. Safe to call repeatedly; uses a DB lock. */
export async function advance(admin: Admin, inv: InvestigationRow): Promise<{ busy?: boolean }> {
  if (!STAGE_OF[inv.status]) return {};
  const now = new Date();
  const until = new Date(now.getTime() + 100_000).toISOString();
  const { data: locked } = await admin
    .from("investigations")
    .update({ lock_until: until })
    .eq("id", inv.id)
    .eq("status", inv.status)
    .or(`lock_until.is.null,lock_until.lt."${now.toISOString()}"`)
    .select("*")
    .maybeSingle();
  if (!locked) return { busy: true };
  const current = locked as InvestigationRow;
  try {
    if (current.status === "deconstructing") await deconstruct(admin, current);
    else if (current.status === "discovering") await discoverStep(admin, current);
    else if (current.status === "examining") await examineStep(admin, current);
    else if (current.status === "concluding") await conclude(admin, current);
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred.";
    const failed = await transition(admin, current, { status: "failed", failed_stage: current.status as never, error_message: message.slice(0, 500) });
    if (failed) await logEvent(admin, current.id, STAGE_OF[current.status]!, "error", message, { failed_stage: current.status, cursor: current.stage_cursor });
  } finally {
    await admin.from("investigations").update({ lock_until: null }).eq("id", current.id);
  }
  return {};
}
