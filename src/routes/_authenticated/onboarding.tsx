import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Network, ScanSearch, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/lib/workspace.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — TRACE//ZERO" }, { name: "description", content: "Set up your TRACE//ZERO workspace." }, { property: "og:title", content: "Welcome — TRACE//ZERO" }, { property: "og:description", content: "Set up your TRACE//ZERO workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Onboarding,
});

const ROLES = ["Journalist", "Researcher", "Student", "Curious citizen", "Other"];

function Onboarding() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [name, setName] = useState<string>((user.user_metadata?.["full_name"] as string | undefined) ?? "");
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    try {
      await updateProfile({ data: { displayName: name.trim(), roleFocus: role, onboarded: true } });
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      void navigate({ to: "/overview" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
      setBusy(false);
    }
  };

  const slides = [
    <div key="0" className="space-y-6">
      <h1 className="editorial text-4xl">Welcome to TRACE//ZERO.</h1>
      <ul className="space-y-4 text-sm">
        {[[ScanSearch, "Submit text, a link or a screenshot. We split it into claims you can edit."], [Network, "Real web research links every source to the claim it supports or contradicts."], [ShieldCheck, "Assessments are cited, show confidence separately, and say what remains unknown."]].map(([I, t], i) => {
          const Icon = I as typeof ScanSearch;
          return <li key={i} className="flex gap-3"><Icon className="mt-0.5 size-4 shrink-0 text-amber" /><span className="text-muted-foreground">{t as string}</span></li>;
        })}
      </ul>
      <Button variant="signal" onClick={() => setStep(1)}>Continue</Button>
    </div>,
    <div key="1" className="space-y-5">
      <h1 className="editorial text-3xl">What should we call you?</h1>
      <Input autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Display name" />
      <div>
        <p className="mb-2 text-sm text-muted-foreground">What brings you here? (optional)</p>
        <div className="flex flex-wrap gap-2">{ROLES.map((r) => <button key={r} type="button" onClick={() => setRole(role === r ? null : r)} className={`rounded-full border px-3 py-1.5 text-xs transition ${role === r ? "border-amber bg-amber-soft" : "border-border hover:border-border-strong"}`}>{r}</button>)}</div>
      </div>
      <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button variant="signal" disabled={!name.trim() || busy} onClick={finish}>{busy && <Loader2 className="animate-spin" />} Enter workspace</Button></div>
    </div>,
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md">
        <LogoMark animate size={40} className="mb-8" />
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{slides[step]}</motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
