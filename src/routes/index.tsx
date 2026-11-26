import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Network, ScanSearch, FileSearch, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ThemeSwitch } from "@/components/app/ThemeSwitch";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TRACE//ZERO — Every claim leaves a trail" },
      { name: "description", content: "Investigate suspicious messages, screenshots, links and viral claims with AI-assisted research and a visual evidence map." },
      { property: "og:title", content: "TRACE//ZERO — Every claim leaves a trail" },
      { property: "og:description", content: "A private digital investigation workspace for claims, sources and evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: ScanSearch, t: "Deconstruct", d: "Your submission is split into individual claims — facts, opinions, predictions — so only checkable statements are researched." },
  { icon: FileSearch, t: "Discover", d: "Live web research favours official and primary sources, recording every URL and publication date." },
  { icon: Network, t: "Examine", d: "Each source is compared with each claim. Support, contradiction and missing context become a navigable constellation." },
  { icon: ShieldCheck, t: "Conclude", d: "A cited assessment with confidence shown separately, plus what remains unknown." },
];

function Landing() {
  const { user } = useAuth();
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-amber/10 blur-3xl" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          {user ? (
            <Button asChild size="sm" variant="outline"><Link to="/overview">Open workspace</Link></Button>
          ) : (
            <Button asChild size="sm" variant="outline"><Link to="/auth" search={{}}>Sign in</Link></Button>
          )}
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-5">
        <section className="pb-20 pt-16 sm:pt-28">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eyebrow mb-5">Digital investigation workspace</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="editorial max-w-4xl text-5xl leading-[1.02] sm:text-7xl">
            Every claim <span className="text-amber">leaves a trail.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Paste a forwarded message, drop a screenshot or share a link. TRACE//ZERO breaks it into claims, researches real sources and shows you exactly where the evidence points — and where it doesn't.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="signal">{user ? <Link to="/investigate">Start an investigation <ArrowRight /></Link> : <Link to="/auth" search={{ redirect: "/investigate" }}>Start an investigation <ArrowRight /></Link>}</Button>
            <Button asChild size="lg" variant="outline"><Link to="/demo">Explore the sample investigation</Link></Button>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">The sample needs no account and uses clearly labelled illustrative data.</p>
        </section>
        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="surface-card p-5">
              <s.icon className="mb-4 size-5 text-amber" />
              <p className="eyebrow mb-1">0{i + 1}</p>
              <h2 className="text-lg font-medium tracking-tight">{s.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </section>
      </main>
      <footer className="relative border-t border-border py-8 text-center text-xs text-muted-foreground">TRACE//ZERO · Assessments are research aids, not final verdicts.</footer>
    </div>
  );
}
