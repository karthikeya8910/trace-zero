import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClaimRow, EventRow, EvidenceRow, InvestigationBundle, InvestigationRow, ProfileRow, ReportRow, SourceRow } from "./domain";

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message || "Could not reach the database. Check your connection.");
}

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      fail(error);
      return data as ProfileRow | null;
    },
    staleTime: 60_000,
  });

export type InvestigationListItem = InvestigationRow & { claims: { assessment: string | null; is_verifiable: boolean }[]; sources: { count: number }[]; reports: { is_public: boolean }[] | { is_public: boolean } | null };

export const investigationsQuery = () =>
  queryOptions({
    queryKey: ["investigations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investigations")
        .select("*, claims(assessment,is_verifiable), sources(count), reports(is_public)")
        .order("created_at", { ascending: false })
        .limit(500);
      fail(error);
      return (data ?? []) as unknown as InvestigationListItem[];
    },
  });

export const recentEventsQuery = () =>
  queryOptions({
    queryKey: ["recent-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investigation_events")
        .select("id, description, event_type, stage, created_at, investigation_id, investigations(title)")
        .order("created_at", { ascending: false })
        .limit(8);
      fail(error);
      return (data ?? []) as unknown as (EventRow & { investigations: { title: string } | null })[];
    },
  });

export const bundleQuery = (id: string) =>
  queryOptions({
    queryKey: ["bundle", id],
    queryFn: async (): Promise<InvestigationBundle> => {
      const [inv, claims, sources, evidence, events, report] = await Promise.all([
        supabase.from("investigations").select("*").eq("id", id).maybeSingle(),
        supabase.from("claims").select("*").eq("investigation_id", id).order("position"),
        supabase.from("sources").select("*").eq("investigation_id", id).order("created_at"),
        supabase.from("evidence").select("*").eq("investigation_id", id),
        supabase.from("investigation_events").select("*").eq("investigation_id", id).order("created_at"),
        supabase.from("reports").select("*").eq("investigation_id", id).maybeSingle(),
      ]);
      fail(inv.error);
      if (!inv.data) throw new Error("NOT_FOUND");
      return {
        mode: "owner",
        investigation: inv.data as InvestigationRow,
        claims: (claims.data ?? []) as ClaimRow[],
        sources: (sources.data ?? []) as SourceRow[],
        evidence: (evidence.data ?? []) as EvidenceRow[],
        events: (events.data ?? []) as EventRow[],
        report: (report.data ?? null) as ReportRow | null,
      };
    },
  });

export function bundleFromPublic(payload: NonNullable<Awaited<ReturnType<typeof import("./public-report.functions").getPublicReport>>>): InvestigationBundle {
  const inv = payload.investigation as unknown as InvestigationRow;
  return {
    mode: "public",
    investigation: { ...inv, original_content: null, source_url: null, uploaded_file_path: null, extracted_text: null } as InvestigationRow,
    claims: payload.claims as unknown as ClaimRow[],
    sources: payload.sources as unknown as SourceRow[],
    evidence: payload.evidence as unknown as EvidenceRow[],
    events: [],
    report: { ...(payload.report as unknown as ReportRow), investigation_id: inv.id, is_public: true, public_token: null, updated_at: payload.report.created_at },
  };
}
