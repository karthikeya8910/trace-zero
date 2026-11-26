import { ExternalLink } from "lucide-react";
import type { EvidenceRow, SourceRow } from "@/lib/domain";
import { RelationshipTag, SourceTypeTag } from "./Badges";

/** Side-by-side comparison from stored source and evidence records (no AI call). */
export function DuelStatic({ sources, evidence, a, b, setA, setB }: { sources: SourceRow[]; evidence: EvidenceRow[]; a: string; b: string; setA: (v: string) => void; setB: (v: string) => void }) {
  const pick = (v: string, set: (v: string) => void, label: string) => (
    <select aria-label={label} value={v} onChange={(e) => set(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
      {sources.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
    </select>
  );
  const col = (id: string) => {
    const s = sources.find((x) => x.id === id);
    if (!s) return null;
    const ev = evidence.filter((e) => e.source_id === id);
    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface/50 p-4">
        <div className="flex flex-wrap gap-2"><SourceTypeTag value={s.source_type} /></div>
        <h3 className="font-medium">{s.title}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Publisher</dt><dd>{s.publisher ?? "Not stated"}</dd>
          <dt className="text-muted-foreground">Published</dt><dd>{s.publication_date ?? "Not stated"}</dd>
        </dl>
        {s.excerpt && <p className="text-sm leading-relaxed text-muted-foreground">{s.excerpt}</p>}
        <ul className="space-y-2">{ev.map((e) => <li key={e.id} className="text-sm"><RelationshipTag value={e.relationship_type} /> <span className="ml-1">{e.summary}</span>{e.limitations && <p className="mt-1 text-xs italic text-muted-foreground">Limitation: {e.limitations}</p>}</li>)}</ul>
        {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-amber underline">Open source <ExternalLink className="size-3" /></a> : <p className="text-xs text-muted-foreground">Illustrative source — no link.</p>}
      </div>
    );
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">{pick(a, setA, "Source A")}{pick(b, setB, "Source B")}</div>
      <div className="grid gap-4 md:grid-cols-2">{col(a)}{col(b)}</div>
      <p className="text-xs text-muted-foreground">Disagreement alone doesn't make either source unreliable — differences can reflect timing, scope or perspective.</p>
    </div>
  );
}
