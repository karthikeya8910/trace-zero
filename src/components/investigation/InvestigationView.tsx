import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, Link2, ImageIcon, Type, Network } from "lucide-react";
import type { InvestigationBundle, ReportContent } from "@/lib/domain";
import { AssessmentBadge, ConfidencePill } from "./Badges";
import { ClaimCard } from "./ClaimCard";
import { SourceCard } from "./SourceCard";
import { ReportView } from "./ReportView";
import { Replay } from "./Replay";
import { RelationshipTag } from "./Badges";
import { Panel, CardSkeleton } from "@/components/common/States";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RELATIONSHIP_LABEL, type Relationship } from "@/lib/domain";

const EvidenceGraph = lazy(() => import("./EvidenceGraph"));

const INPUT_ICON = { text: Type, url: Link2, image: ImageIcon } as const;

/** Full read view of an investigation bundle — used by the demo, the owner detail page and public links. */
export function InvestigationView({ bundle, actions, defaultTab = "claims" }: { bundle: InvestigationBundle; actions?: ReactNode; defaultTab?: string }) {
  const { investigation: inv, claims, sources, evidence, report } = bundle;
  const [tab, setTab] = useState(defaultTab);
  const sourceRefs = useRef(new Map<string, HTMLDivElement>());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const focusSource = (id: string) => {
    setTab("sources");
    requestAnimationFrame(() => {
      const el = sourceRefs.current.get(id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("ring-2", "ring-amber");
      window.setTimeout(() => el?.classList.remove("ring-2", "ring-amber"), 1800);
    });
  };

  const InputIcon = INPUT_ICON[(inv.input_type as keyof typeof INPUT_ICON) in INPUT_ICON ? (inv.input_type as keyof typeof INPUT_ICON) : "text"];
  const reportContent = (report?.report_content ?? null) as ReportContent | null;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1">
            <InputIcon className="size-3.5" /> {inv.input_type === "url" ? "Link submission" : inv.input_type === "image" ? "Screenshot submission" : "Text submission"}
          </span>
          <span className="font-mono text-[0.7rem]">{new Date(inv.created_at).toLocaleString()}</span>
          {bundle.mode === "demo" && <span className="rounded-full border border-amber/40 bg-amber-soft px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-amber">Sample</span>}
        </div>
        <h1 className="editorial text-3xl sm:text-4xl">{inv.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <AssessmentBadge value={inv.overall_assessment} size="lg" />
          <ConfidencePill value={inv.confidence_level} label="Overall confidence" />
        </div>
        {inv.summary && <p className="max-w-3xl text-[0.95rem] leading-relaxed text-muted-foreground">{inv.summary}</p>}
        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="no-print flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {[
            ["claims", `Claims (${claims.length})`],
            ["sources", `Sources (${sources.length})`],
            ["evidence", `Evidence (${evidence.length})`],
            ["graph", "Constellation"],
            ["replay", "Replay"],
            ["report", "Report"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value!}
              className="rounded-full border border-border px-4 py-1.5 text-xs data-[state=active]:border-amber/50 data-[state=active]:bg-amber-soft data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="claims" className="mt-6 space-y-4">
          {claims.map((c, i) => (
            <ClaimCard key={c.id} claim={c} index={i} evidence={evidence} sources={sources} onSource={focusSource} defaultOpen={i === 0} />
          ))}
        </TabsContent>

        <TabsContent value="sources" className="mt-6 space-y-4">
          {sources.map((s, i) => (
            <SourceCard key={s.id} source={s} index={i} ref={(el) => { if (el) sourceRefs.current.set(s.id, el); else sourceRefs.current.delete(s.id); }} />
          ))}
        </TabsContent>

        <TabsContent value="evidence" className="mt-6">
          <Panel eyebrow="Cross-examination" title="Every evidence link, with its limits">
            <ul className="space-y-3">
              {evidence.map((e) => {
                const claim = claims.find((c) => c.id === e.claim_id);
                const source = sources.find((s) => s.id === e.source_id);
                return (
                  <li key={e.id} className="rounded-lg border border-border bg-surface/50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <RelationshipTag value={e.relationship_type} />
                      {e.is_outdated && <span className="rounded border border-ev-mixed/40 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase text-ev-mixed">Outdated</span>}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{e.summary}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Claim:</span> {claim?.claim_text ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Source:</span>{" "}
                      {source ? (
                        <button type="button" className="underline decoration-border-strong underline-offset-2 hover:decoration-amber" onClick={() => focusSource(source.id)}>
                          {source.title}
                        </button>
                      ) : "—"}
                    </p>
                    {e.limitations && <p className="mt-2 text-[0.7rem] italic leading-relaxed text-muted-foreground/80">Limitation: {e.limitations}</p>}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="graph" className="no-print mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Network className="size-4 text-amber" />
            <span>Claims on the left, sources on the right. Lines show how each piece of evidence relates.</span>
            {(["supports", "contradicts", "context", "neutral"] as Relationship[]).map((r) => (
              <span key={r} className="inline-flex items-center gap-1.5">
                <RelationshipTag value={r} />
                <span className="sr-only">{RELATIONSHIP_LABEL[r]}</span>
              </span>
            ))}
          </div>
          {mounted ? (
            <Suspense fallback={<CardSkeleton rows={5} />}>
              <EvidenceGraph claims={claims} sources={sources} evidence={evidence} onSelectSource={focusSource} />
            </Suspense>
          ) : (
            <CardSkeleton rows={5} />
          )}
        </TabsContent>

        <TabsContent value="replay" className="no-print mt-6">
          <Replay bundle={bundle} />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          {reportContent ? (
            <ReportView content={reportContent} sources={sources} onSource={focusSource} />
          ) : (
            <Panel title="No report yet">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="size-4" /> The final report appears here when the investigation concludes.
              </p>
            </Panel>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
