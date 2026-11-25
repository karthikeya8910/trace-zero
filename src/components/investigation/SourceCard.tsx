import { forwardRef } from "react";
import { CalendarDays, ExternalLink } from "lucide-react";
import type { SourceRow } from "@/lib/domain";
import { RetrievalTag, SourceTypeTag } from "./Badges";

export const SourceCard = forwardRef<HTMLDivElement, { source: SourceRow; index: number }>(function SourceCard({ source, index }, ref) {
  return (
    <div ref={ref} id={`source-${source.id}`} className="surface-card print-plain scroll-mt-24 p-5 transition-shadow">
      <div className="flex items-start gap-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-amber/40 bg-amber-soft font-mono text-[0.65rem] font-medium text-amber">S{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SourceTypeTag value={source.source_type} />
            <RetrievalTag value={source.retrieval_status} />
            {source.publication_date && (
              <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                <CalendarDays className="size-3" /> {source.publication_date}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[0.95rem] font-medium leading-snug">{source.title}</h3>
          {source.publisher && <p className="mt-0.5 text-xs text-muted-foreground">{source.publisher}</p>}
          {source.excerpt && (
            <blockquote className="mt-3 border-l-2 border-border-strong pl-3 text-xs leading-relaxed text-muted-foreground">{source.excerpt}</blockquote>
          )}
          {source.url && (
            <a href={source.url} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber hover:underline">
              Open original source <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
});
