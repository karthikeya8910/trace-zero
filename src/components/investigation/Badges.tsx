import { ShieldCheck, Gauge } from "lucide-react";
import { ASSESSMENT_META, RELATIONSHIP_META, asAssessment, asRelationship } from "./assessment-meta";
import { RELATIONSHIP_LABEL, SOURCE_TYPE_LABEL, type SourceType } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function AssessmentBadge({ value, size = "md", className }: { value: string | null | undefined; size?: "sm" | "md" | "lg"; className?: string }) {
  const a = asAssessment(value);
  if (!a)
    return <span className={cn("inline-flex items-center rounded-full border border-border px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground", className)}>Not assessed</span>;
  const m = ASSESSMENT_META[a];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-[0.14em]",
        m.text, m.bg, m.border,
        size === "sm" && "px-2 py-0.5 text-[0.6rem] [&_svg]:size-3",
        size === "md" && "px-2.5 py-1 text-[0.65rem] [&_svg]:size-3.5",
        size === "lg" && "px-3.5 py-1.5 text-xs [&_svg]:size-4",
        className,
      )}
    >
      <m.icon aria-hidden="true" />
      {m.label}
    </span>
  );
}

export function ConfidencePill({ value, label = "Confidence" }: { value: string | null | undefined; label?: string }) {
  if (!value) return null;
  const level = value === "high" ? 3 : value === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground" title={`${label}: ${value}`}>
      <Gauge className="size-3.5" />
      <span className="sr-only">{label}:</span>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-2.5 w-1 rounded-full", i <= level ? "bg-foreground/80" : "bg-border-strong")} />
        ))}
      </span>
      <span className="capitalize text-foreground">{value}</span>
    </span>
  );
}

export function StrengthPill({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
      <ShieldCheck className="size-3.5" /> Evidence <span className="capitalize text-foreground">{value}</span>
    </span>
  );
}

export function RelationshipTag({ value }: { value: string }) {
  const r = asRelationship(value);
  const m = RELATIONSHIP_META[r];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-medium", m.text, m.bg)}>
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {RELATIONSHIP_LABEL[r]}
    </span>
  );
}

export function SourceTypeTag({ value }: { value: string }) {
  const official = value === "official" || value === "primary";
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em]", official ? "border-amber/40 text-amber" : "border-border text-muted-foreground")}>
      {SOURCE_TYPE_LABEL[(value as SourceType) in SOURCE_TYPE_LABEL ? (value as SourceType) : "other"]}
    </span>
  );
}

export function RetrievalTag({ value }: { value: string }) {
  if (value === "retrieved") return null;
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em]", value === "inaccessible" ? "border-ev-contradict/40 text-ev-contradict" : "border-border text-muted-foreground")}>
      {value === "inaccessible" ? "Inaccessible" : "Snippet only"}
    </span>
  );
}
