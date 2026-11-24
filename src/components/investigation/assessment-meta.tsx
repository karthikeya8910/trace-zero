import { CheckCircle2, XCircle, Scale, HelpCircle, Layers, type LucideIcon } from "lucide-react";
import type { Assessment, Relationship } from "@/lib/domain";

export const ASSESSMENT_META: Record<
  Assessment,
  { label: string; icon: LucideIcon; text: string; bg: string; border: string; dot: string; blurb: string }
> = {
  supported: {
    label: "Supported",
    icon: CheckCircle2,
    text: "text-ev-support",
    bg: "bg-ev-support/10",
    border: "border-ev-support/30",
    dot: "bg-ev-support",
    blurb: "Reliable evidence backs this claim.",
  },
  contradicted: {
    label: "Contradicted",
    icon: XCircle,
    text: "text-ev-contradict",
    bg: "bg-ev-contradict/10",
    border: "border-ev-contradict/30",
    dot: "bg-ev-contradict",
    blurb: "Reliable evidence conflicts with this claim.",
  },
  mixed: {
    label: "Mixed",
    icon: Scale,
    text: "text-ev-mixed",
    bg: "bg-ev-mixed/10",
    border: "border-ev-mixed/30",
    dot: "bg-ev-mixed",
    blurb: "Evidence points in more than one direction.",
  },
  unverified: {
    label: "Unverified",
    icon: HelpCircle,
    text: "text-ev-unresolved",
    bg: "bg-ev-unresolved/10",
    border: "border-ev-unresolved/30",
    dot: "bg-ev-unresolved",
    blurb: "Not enough reliable evidence to decide. This is not the same as false.",
  },
  missing_context: {
    label: "Missing context",
    icon: Layers,
    text: "text-ev-neutral",
    bg: "bg-ev-neutral/10",
    border: "border-ev-neutral/30",
    dot: "bg-ev-neutral",
    blurb: "Partly accurate, but important context changes its meaning.",
  },
};

export const RELATIONSHIP_META: Record<Relationship, { text: string; bg: string; stroke: string; dot: string }> = {
  supports: { text: "text-ev-support", bg: "bg-ev-support/10", stroke: "var(--ev-support)", dot: "bg-ev-support" },
  contradicts: { text: "text-ev-contradict", bg: "bg-ev-contradict/10", stroke: "var(--ev-contradict)", dot: "bg-ev-contradict" },
  context: { text: "text-ev-neutral", bg: "bg-ev-neutral/10", stroke: "var(--ev-neutral)", dot: "bg-ev-neutral" },
  neutral: { text: "text-ev-unresolved", bg: "bg-ev-unresolved/10", stroke: "var(--ev-unresolved)", dot: "bg-ev-unresolved" },
};

export function asAssessment(value: string | null | undefined): Assessment | null {
  return value && value in ASSESSMENT_META ? (value as Assessment) : null;
}
export function asRelationship(value: string): Relationship {
  return value in RELATIONSHIP_META ? (value as Relationship) : "neutral";
}
