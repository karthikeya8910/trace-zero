import { Fragment, type ReactNode } from "react";
import { CalendarClock, Info } from "lucide-react";
import type { ReportContent, SourceRow } from "@/lib/domain";
import { Panel } from "@/components/common/States";

/** Renders report prose, turning [src:<id>] citations into reference chips. */
function Cited({ text, sources, onSource }: { text: string; sources: SourceRow[]; onSource?: (id: string) => void }) {
  const parts = text.split(/(\[src:[^\]]+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[src:([^\]]+)\]$/.exec(part);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        const id = m[1]!;
        const idx = sources.findIndex((s) => s.id === id);
        const label = idx >= 0 ? `S${idx + 1}` : "S?";
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSource?.(id)}
            className="mx-0.5 inline-flex translate-y-[-1px] items-center rounded border border-amber/40 bg-amber-soft px-1 font-mono text-[0.65rem] font-medium text-amber transition-colors hover:bg-amber/20"
            title={idx >= 0 ? sources[idx]!.title : "Source reference"}
          >
            {label}
          </button>
        );
      })}
    </>
  );
}

export function ReportView({ content, sources, onSource }: { content: ReportContent; sources: SourceRow[]; onSource?: (id: string) => void }) {
  const cite = (text: string): ReactNode => <Cited text={text} sources={sources} onSource={onSource} />;
  return (
    <div className="space-y-5">
      {content.illustrative && (
        <p className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber-soft px-3 py-2.5 text-xs leading-relaxed text-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-amber" />
          Illustrative sample: every source and publisher in this report is fictional, shown to demonstrate the format.
        </p>
      )}
      {content.summary && (
        <Panel eyebrow="Summary" title="What the evidence shows">
          <p className="text-[0.95rem] leading-relaxed">{cite(content.summary)}</p>
        </Panel>
      )}
      {content.reasoning && (
        <Panel eyebrow="Reasoning" title="How this conclusion was reached">
          <p className="text-sm leading-relaxed text-muted-foreground">{cite(content.reasoning)}</p>
        </Panel>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {content.known && content.known.length > 0 && (
          <Panel eyebrow="Established" title="What we know">
            <ul className="space-y-2.5">
              {content.known.map((k, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ev-support" />
                  <span>{cite(k)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {content.unknown && content.unknown.length > 0 && (
          <Panel eyebrow="Open" title="What remains unknown">
            <ul className="space-y-2.5">
              {content.unknown.map((k, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ev-unresolved" />
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
      {content.timeline && content.timeline.length > 0 && (
        <Panel eyebrow="Chronology" title="Timeline">
          <ol className="relative space-y-4 border-l border-border pl-5">
            {content.timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.42rem] top-1.5 size-2 rounded-full border border-amber bg-background" />
                <p className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  <CalendarClock className="size-3" /> {t.date}
                </p>
                <p className="mt-1 text-sm leading-relaxed">{t.event}</p>
              </li>
            ))}
          </ol>
        </Panel>
      )}
      {content.limitations && (
        <Panel eyebrow="Honesty" title="Limitations of this assessment">
          <p className="text-sm leading-relaxed text-muted-foreground">{content.limitations}</p>
        </Panel>
      )}
    </div>
  );
}
