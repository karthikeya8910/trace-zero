import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Pencil } from "lucide-react";
import type { ClaimRow, EvidenceRow, SourceRow } from "@/lib/domain";
import { CLAIM_TYPE_LABEL, type ClaimType } from "@/lib/domain";
import { AssessmentBadge, ConfidencePill, RelationshipTag, StrengthPill } from "./Badges";
import { cn } from "@/lib/utils";

export function ClaimCard({
  claim,
  index,
  evidence,
  sources,
  onSource,
  defaultOpen = false,
}: {
  claim: ClaimRow;
  index: number;
  evidence: EvidenceRow[];
  sources: SourceRow[];
  onSource?: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const linked = evidence.filter((e) => e.claim_id === claim.id);
  const srcById = new Map(sources.map((s) => [s.id, s]));
  const typeLabel = CLAIM_TYPE_LABEL[(claim.claim_type as ClaimType) in CLAIM_TYPE_LABEL ? (claim.claim_type as ClaimType) : "factual"];

  return (
    <motion.article layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="surface-card print-plain overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-4 p-5 text-left" aria-expanded={open}>
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border font-mono text-[0.65rem] text-muted-foreground">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-medium leading-snug">{claim.claim_text}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <AssessmentBadge value={claim.assessment} size="sm" />
            <ConfidencePill value={claim.confidence_level} />
            <StrengthPill value={claim.evidence_strength} />
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">{typeLabel}</span>
            {claim.user_edited && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.65rem] text-muted-foreground">
                <Pencil className="size-2.5" /> Edited by you
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="space-y-4 border-t border-border px-5 py-4">
              {claim.explanation && <p className="text-sm leading-relaxed text-muted-foreground">{claim.explanation}</p>}
              {(claim.unresolved as string[]).length > 0 && (
                <div>
                  <p className="eyebrow mb-2">Still unresolved</p>
                  <ul className="space-y-1.5">
                    {(claim.unresolved as string[]).map((u, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-ev-unresolved" /> {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {linked.length > 0 && (
                <div>
                  <p className="eyebrow mb-2">Evidence links ({linked.length})</p>
                  <ul className="space-y-2">
                    {linked.map((e) => {
                      const src = srcById.get(e.source_id);
                      return (
                        <li key={e.id} className="rounded-lg border border-border bg-surface/50 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <RelationshipTag value={e.relationship_type} />
                            {src && (
                              <button type="button" onClick={() => onSource?.(src.id)} className="truncate text-xs font-medium text-foreground underline decoration-border-strong underline-offset-2 hover:decoration-amber">
                                {src.title}
                              </button>
                            )}
                            {e.is_outdated && <span className="rounded border border-ev-mixed/40 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase text-ev-mixed">Outdated</span>}
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{e.summary}</p>
                          {e.limitations && <p className="mt-1 text-[0.7rem] italic leading-relaxed text-muted-foreground/80">Limitation: {e.limitations}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
