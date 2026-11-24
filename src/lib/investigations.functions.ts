import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkPublicHttpUrl } from "@/lib/url-safety";
import type { InvestigationRow } from "@/lib/domain";

const uuid = z.string().uuid();
const RATE_LIMIT_PER_HOUR = 15;
const MAX_ACTIVE = 3;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function ownInvestigation(supabase: { from: (t: "investigations") => any }, id: string): Promise<InvestigationRow> {
  const { data, error } = await supabase.from("investigations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load the investigation. Check your connection and try again.");
  if (!data) throw new Error("Investigation not found.");
  return data as InvestigationRow;
}

const createInput = z.discriminatedUnion("inputType", [
  z.object({ inputType: z.literal("text"), text: z.string().trim().min(12, "Please paste at least a full sentence.").max(20000, "Text is limited to 20,000 characters.") }),
  z.object({ inputType: z.literal("url"), url: z.string().trim().min(4).max(2048) }),
  z.object({ inputType: z.literal("image"), filePath: z.string().max(300), note: z.string().max(2000).optional() }),
]);

export const createInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let original: string | null = null;
    let sourceUrl: string | null = null;
    let filePath: string | null = null;
    if (data.inputType === "text") original = data.text;
    if (data.inputType === "url") {
      const check = checkPublicHttpUrl(data.url);
      if (!check.ok) throw new Error(check.reason);
      sourceUrl = check.url.toString();
      original = sourceUrl;
    }
    if (data.inputType === "image") {
      if (!new RegExp(`^${userId}/[a-zA-Z0-9-]{8,64}\\.(png|jpe?g|webp)$`).test(data.filePath)) throw new Error("Invalid upload reference.");
      filePath = data.filePath;
      original = data.note?.trim() || null;
    }

    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recent } = await supabase.from("investigations").select("id", { count: "exact", head: true }).gte("created_at", hourAgo);
    if ((recent ?? 0) >= RATE_LIMIT_PER_HOUR) throw new Error(`You've reached the limit of ${RATE_LIMIT_PER_HOUR} investigations per hour. Please try again later.`);
    const { count: active } = await supabase
      .from("investigations")
      .select("id", { count: "exact", head: true })
      .in("status", ["deconstructing", "discovering", "examining", "concluding"]);
    if ((active ?? 0) >= MAX_ACTIVE) throw new Error("You already have several investigations running. Wait for one to finish before starting another.");

    // Duplicate submission prevention: identical submission within 2 minutes returns the existing record.
    const dupQuery = supabase
      .from("investigations")
      .select("id")
      .eq("input_type", data.inputType)
      .neq("status", "failed")
      .gte("created_at", new Date(Date.now() - 120_000).toISOString())
      .limit(1);
    const { data: dup } = filePath ? await dupQuery.eq("uploaded_file_path", filePath) : await dupQuery.eq("original_content", original ?? "");
    if (dup?.[0]) return { id: dup[0].id as string, duplicate: true };

    const db = await admin();
    const { data: row, error } = await db
      .from("investigations")
      .insert({ user_id: userId, input_type: data.inputType, original_content: original, source_url: sourceUrl, uploaded_file_path: filePath, status: "deconstructing" })
      .select("id")
      .single();
    if (error || !row) throw new Error("The investigation could not be created. Please try again.");
    const { logEvent } = await import("@/server/pipeline.server");
    const label = data.inputType === "text" ? `${original!.length} characters of text` : data.inputType === "url" ? `the URL ${sourceUrl}` : "an uploaded image";
    await logEvent(db, row.id, "intake", "intake.received", `Received ${label}. Original submission preserved privately.`, { input_type: data.inputType });
    return { id: row.id, duplicate: false };
  });

export const advanceInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: uuid.parse(input.id) }))
  .handler(async ({ data, context }) => {
    const inv = await ownInvestigation(context.supabase, data.id);
    const { advance } = await import("@/server/pipeline.server");
    const res = await advance(await admin(), inv);
    const fresh = await ownInvestigation(context.supabase, data.id);
    return { status: fresh.status, busy: Boolean(res.busy), error: fresh.error_message };
  });

const claimInput = z.object({
  id: uuid.optional(),
  text: z.string().trim().min(3, "Claims need at least a few words.").max(1000),
  type: z.enum(["factual", "opinion", "prediction", "question", "subjective"]),
});

export const confirmClaims = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid, claims: z.array(claimInput).min(1, "Keep at least one claim.").max(10, "Up to 10 claims per investigation.") }).parse(input))
  .handler(async ({ data, context }) => {
    const inv = await ownInvestigation(context.supabase, data.id);
    if (inv.status !== "awaiting_review") throw new Error("These claims have already been confirmed.");
    const db = await admin();
    const { data: existing } = await db.from("claims").select("*").eq("investigation_id", inv.id);
    const byId = new Map((existing ?? []).map((c) => [c.id, c]));
    const keep = new Set(data.claims.map((c) => c.id).filter(Boolean) as string[]);
    const removed = (existing ?? []).filter((c) => !keep.has(c.id));
    if (removed.length) await db.from("claims").delete().in("id", removed.map((c) => c.id));
    let edited = 0;
    let added = 0;
    for (const [i, c] of data.claims.entries()) {
      const prev = c.id ? byId.get(c.id) : undefined;
      if (prev) {
        const changed = prev.claim_text !== c.text || prev.claim_type !== c.type;
        if (changed) edited++;
        await db
          .from("claims")
          .update({
            position: i,
            claim_text: c.text,
            claim_type: c.type,
            is_verifiable: c.type === "factual",
            user_edited: prev.user_edited || changed,
            search_queries: prev.claim_text !== c.text ? [c.text.slice(0, 200)] : prev.search_queries,
          })
          .eq("id", prev.id);
      } else {
        added++;
        await db.from("claims").insert({ investigation_id: inv.id, position: i, claim_text: c.text, claim_type: c.type, is_verifiable: c.type === "factual", user_edited: true, search_queries: [c.text.slice(0, 200)] });
      }
    }
    const { logEvent } = await import("@/server/pipeline.server");
    await logEvent(db, inv.id, "review", "review.confirmed", `You confirmed ${data.claims.length} claim${data.claims.length === 1 ? "" : "s"} (${edited} edited, ${added} added, ${removed.length} removed).`, { kept: data.claims.length, edited, added, removed: removed.length });
    await db.from("investigations").update({ status: "discovering", stage_cursor: 0, research_mode: "pending" }).eq("id", inv.id).eq("status", "awaiting_review");
    return { ok: true };
  });

export const cancelInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: uuid.parse(input.id) }))
  .handler(async ({ data, context }) => {
    const inv = await ownInvestigation(context.supabase, data.id);
    if (["completed", "cancelled"].includes(inv.status)) return { ok: true };
    const db = await admin();
    const stage = ["deconstructing", "discovering", "examining", "concluding"].includes(inv.status) ? inv.status : inv.failed_stage;
    await db.from("investigations").update({ status: "cancelled", failed_stage: (stage as never) ?? null, lock_until: null }).eq("id", inv.id);
    const { logEvent } = await import("@/server/pipeline.server");
    await logEvent(db, inv.id, "system", "cancelled", "Investigation cancelled by you. Progress so far is preserved.", { stage });
    return { ok: true };
  });

export const retryInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: uuid.parse(input.id) }))
  .handler(async ({ data, context }) => {
    const inv = await ownInvestigation(context.supabase, data.id);
    if (!["failed", "cancelled"].includes(inv.status)) return { ok: true };
    const db = await admin();
    const { count } = await db.from("claims").select("id", { count: "exact", head: true }).eq("investigation_id", inv.id);
    const resumeTo = inv.failed_stage ?? ((count ?? 0) > 0 ? "awaiting_review" : "deconstructing");
    await db.from("investigations").update({ status: resumeTo, error_message: null, lock_until: null }).eq("id", inv.id);
    const { logEvent } = await import("@/server/pipeline.server");
    await logEvent(db, inv.id, "system", "resumed", `Resumed from the ${resumeTo.replace("_", " ")} stage.`, { stage: resumeTo, cursor: inv.stage_cursor });
    return { ok: true, status: resumeTo };
  });

export const getServiceStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { searchProvider } = await import("@/server/search.server");
    const { error } = await context.supabase.from("profiles").select("id").limit(1);
    return {
      ai: { configured: Boolean(process.env["LOVABLE_API_KEY"]), model: "Gemini 3.8 Flash" },
      search: { provider: searchProvider() },
      backend: { ok: !error },
      storage: { bucket: "submissions (private)" },
    };
  });

export const compareSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid, a: uuid, b: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    await ownInvestigation(context.supabase, data.id);
    const { data: srcs } = await context.supabase.from("sources").select("*").eq("investigation_id", data.id).in("id", [data.a, data.b]);
    const A = srcs?.find((s) => s.id === data.a);
    const B = srcs?.find((s) => s.id === data.b);
    if (!A || !B) throw new Error("Both sources must belong to this investigation.");
    const { data: claims } = await context.supabase.from("claims").select("claim_text").eq("investigation_id", data.id).order("position");
    const { geminiJson } = await import("@/server/ai.server");
    const block = (s: typeof A, tag: string) =>
      `<source id="${tag}" publisher="${(s.publisher ?? "unknown").replace(/"/g, "'")}" date="${s.publication_date ?? "not stated"}">\nTITLE: ${s.title}\n${(s.excerpt ?? "").slice(0, 3000)}\n</source>`;
    return geminiJson<{ statements_a: string[]; statements_b: string[]; agreements: string[]; differences: string[]; missing_context: string[]; contradictions: string[]; limitations_a: string; limitations_b: string; note: string }>({
      name: "source_duel",
      system: `Compare two sources neutrally for an investigation. Report what each states (paraphrased, no invented quotes), where they agree, where they differ, contradictions, and context each one omits.
Never declare one source unreliable merely because it disagrees with the other; differences may reflect timing, scope or perspective. Base everything only on the provided text.`,
      user: `<untrusted_content>\nINVESTIGATED CLAIMS:\n${(claims ?? []).map((c, i) => `${i + 1}. ${c.claim_text}`).join("\n")}\n\n${block(A, "A")}\n\n${block(B, "B")}\n</untrusted_content>`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["statements_a", "statements_b", "agreements", "differences", "missing_context", "contradictions", "limitations_a", "limitations_b", "note"],
        properties: {
          statements_a: { type: "array", items: { type: "string" } },
          statements_b: { type: "array", items: { type: "string" } },
          agreements: { type: "array", items: { type: "string" } },
          differences: { type: "array", items: { type: "string" } },
          missing_context: { type: "array", items: { type: "string" } },
          contradictions: { type: "array", items: { type: "string" } },
          limitations_a: { type: "string" },
          limitations_b: { type: "string" },
          note: { type: "string" },
        },
      },
    });
  });

export const getUploadPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: uuid.parse(input.id) }))
  .handler(async ({ data, context }) => {
    const inv = await ownInvestigation(context.supabase, data.id);
    if (!inv.uploaded_file_path) return { url: null };
    const { data: signed } = await context.supabase.storage.from("submissions").createSignedUrl(inv.uploaded_file_path, 300);
    return { url: signed?.signedUrl ?? null };
  });

export const deleteInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: uuid.parse(input.id) }))
  .handler(async ({ data, context }) => {
    const inv = await ownInvestigation(context.supabase, data.id);
    if (inv.uploaded_file_path) await context.supabase.storage.from("submissions").remove([inv.uploaded_file_path]);
    const { error } = await context.supabase.from("investigations").delete().eq("id", inv.id);
    if (error) throw new Error("The investigation could not be deleted.");
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(input))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: files } = await supabase.storage.from("submissions").list(userId, { limit: 1000 });
    if (files?.length) await supabase.storage.from("submissions").remove(files.map((f) => `${userId}/${f.name}`));
    await supabase.from("investigations").delete().eq("user_id", userId);
    const db = await admin();
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw new Error("Your data was deleted, but the account could not be removed. Please try again.");
    return { ok: true };
  });
