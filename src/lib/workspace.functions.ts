import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

/** Onboarding + settings: the signed-in user updates their own profile row (RLS-scoped). */
export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        displayName: z.string().trim().min(1, "Tell us what to call you.").max(60).optional(),
        roleFocus: z.string().trim().max(60).nullable().optional(),
        onboarded: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.displayName !== undefined) patch["display_name"] = data.displayName;
    if (data.roleFocus !== undefined) patch["role_focus"] = data.roleFocus;
    if (data.onboarded) patch["onboarded_at"] = new Date().toISOString();
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error("Your profile could not be saved. Please try again.");
    return { ok: true };
  });

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s; // 48 hex chars, matches the public-link validator
}

/** Owner only: publish or unpublish the shareable read-only report link. */
export const setReportPublic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid, makePublic: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase.from("investigations").select("id, status").eq("id", data.id).maybeSingle();
    if (error || !inv) throw new Error("Investigation not found.");
    if (inv.status !== "completed") throw new Error("A report can only be shared once the investigation is complete.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("reports").select("id, public_token").eq("investigation_id", inv.id).maybeSingle();
    if (!existing) throw new Error("No report exists for this investigation yet.");
    const token = existing.public_token ?? newToken();
    const { error: upErr } = await supabaseAdmin
      .from("reports")
      .update({
        is_public: data.makePublic,
        public_token: token,
        published_at: data.makePublic ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);
    if (upErr) throw new Error("The sharing setting could not be saved.");
    return { ok: true, token, url: data.makePublic ? `/report/${token}` : null };
  });
