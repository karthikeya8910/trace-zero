import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Info, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ThemeSwitch } from "@/components/app/ThemeSwitch";
import { InvestigationView } from "@/components/investigation/InvestigationView";
import { DuelStatic } from "@/components/investigation/DuelStatic";
import { Panel } from "@/components/common/States";
import { DEMO_BUNDLE } from "@/lib/demo-data";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Sample investigation — TRACE//ZERO" },
      { name: "description", content: "Explore a complete illustrative TRACE//ZERO investigation: claims, evidence constellation, source duel, replay and report." },
      { property: "og:title", content: "Sample investigation — TRACE//ZERO" },
      { property: "og:description", content: "An illustrative walkthrough of an AI-assisted claim investigation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Demo,
});

function Demo() {
  const sources = DEMO_BUNDLE.sources;
  const [a, setA] = useState(sources[0]?.id ?? "");
  const [b, setB] = useState(sources[1]?.id ?? "");
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <Link to="/" className="flex items-center gap-2"><ArrowLeft className="size-4" /><Logo /></Link>
          <div className="flex items-center gap-2"><ThemeSwitch /><Button asChild size="sm" variant="signal"><Link to="/auth" search={{ redirect: "/investigate" }}>Investigate your own</Link></Button></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-10 px-5 py-8">
        <div role="note" className="flex gap-3 rounded-xl border border-amber/40 bg-amber-soft p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-amber" />
          <p><strong>Demo mode.</strong> This investigation, its claim and its sources are fictional and illustrative. No live research was performed and no real publications are cited. It is never mixed with your own investigations.</p>
        </div>
        <InvestigationView bundle={DEMO_BUNDLE} defaultTab="graph" />
        <Panel eyebrow="Source Duel" title={<span className="inline-flex items-center gap-2"><Swords className="size-4 text-amber" /> Compare two illustrative sources</span>}>
          <DuelStatic sources={sources} evidence={DEMO_BUNDLE.evidence} a={a} b={b} setA={setA} setB={setB} />
        </Panel>
      </main>
    </div>
  );
}
