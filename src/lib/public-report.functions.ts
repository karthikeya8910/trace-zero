import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Public, read-only: returns a shared report only when its owner explicitly made it public. */
export const getPublicReport = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => {
    const token = String(input?.token ?? "");
    if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) throw new Error("Invalid link");
    return { token };
  })
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: payload, error } = await client.rpc("get_public_report", { _token: data.token });
    if (error) throw new Error("This report could not be loaded.");
    return (payload ?? null) as unknown as null | {
      report: { id: string; report_content: any; published_at: string | null; created_at: string };
      investigation: Record<string, any>;
      claims: Record<string, any>[];
      sources: Record<string, any>[];
      evidence: Record<string, any>[];
    };
  });
