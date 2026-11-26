import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { InvestigationBundle } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { AssessmentBadge, RelationshipTag } from "./Badges";

type Step = { key: string; label: string; time: string | null; body: React.ReactNode };

/** Chronological replay built only from stored records and recorded events. */
export function Replay({ bundle }: { bundle: InvestigationBundle }) {
  const { investigation: inv, claims, sources, evidence, events } = bundle;
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = [];
    s.push({ key: "submission", label: "Original submission", time: inv.created_at, body: <p className="whitespace-pre-wrap text-sm leading-relaxed">{inv.original_content ?? inv.source_url ?? (inv.input_type === "image" ? "Screenshot submission (kept private)." : "Not shown for shared reports.")}</p> });
    s.push({ key: "claims", label: `Extracted claims (${claims.length})`, time: null, body: <ol className="list-decimal space-y-1 pl-5 text-sm">{claims.map((c) => <li key={c.id}>{c.claim_text} <span className="text-xs text-muted-foreground">· {c.claim_type}</span></li>)}</ol> });
    for (const e of events) s.push({ key: e.id, label: e.description, time: e.created_at, body: <p className="font-mono text-xs text-muted-foreground">{e.stage} · {e.event_type}</p> });
    s.push({ key: "sources", label: `Sources discovered (${sources.length})`, time: null, body: <ul className="space-y-1 text-sm">{sources.map((x) => <li key={x.id}>{x.title} <span className="text-xs text-muted-foreground">· {x.publisher ?? "Unknown publisher"}</span></li>)}</ul> });
    const contra = evidence.filter((e) => e.relationship_type === "contradicts");
    s.push({ key: "links", label: `Evidence relationships (${evidence.length})`, time: null, body: <ul className="space-y-2 text-sm">{evidence.map((e) => <li key={e.id} className="flex gap-2"><RelationshipTag value={e.relationship_type} /> <span>{e.summary}</span></li>)}</ul> });
    s.push({ key: "contra", label: `Contradictions identified (${contra.length})`, time: null, body: contra.length ? <ul className="space-y-1 text-sm">{contra.map((e) => <li key={e.id}>{e.summary}</li>)}</ul> : <p className="text-sm text-muted-foreground">No contradicting evidence was recorded.</p> });
    s.push({ key: "final", label: "Final assessment", time: inv.updated_at, body: <div className="space-y-2"><AssessmentBadge value={inv.overall_assessment} size="lg" />{inv.summary && <p className="text-sm">{inv.summary}</p>}</div> });
    return s;
  }, [inv, claims, sources, evidence, events]);
  const [i, setI] = useState(0);
  const step = steps[i]!;
  return (
    <div className="surface-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="eyebrow">Step {i + 1} of {steps.length}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Previous step"><ChevronLeft /></Button>
          <Button size="sm" variant="outline" disabled={i === steps.length - 1} onClick={() => setI(i + 1)} aria-label="Next step"><ChevronRight /></Button>
        </div>
      </div>
      <input type="range" min={0} max={steps.length - 1} value={i} onChange={(e) => setI(Number(e.target.value))} className="mb-5 w-full accent-[var(--amber)]" aria-label="Replay position" />
      <AnimatePresence mode="wait">
        <motion.div key={step.key} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
          <h3 className="mb-1 text-lg font-medium tracking-tight">{step.label}</h3>
          {step.time && <p className="mb-3 font-mono text-[0.7rem] text-muted-foreground">{new Date(step.time).toLocaleString()}</p>}
          {step.body}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
