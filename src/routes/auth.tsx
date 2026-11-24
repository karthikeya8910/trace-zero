import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/common/Field";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { GoogleIcon } from "@/components/brand/GoogleIcon";
import { useAuth } from "@/lib/auth";
import { safeRedirect } from "@/lib/safe-redirect";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; mode?: Mode } => ({
    ...(typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
    ...(s["mode"] === "signup" || s["mode"] === "forgot" || s["mode"] === "signin" ? { mode: s["mode"] as Mode } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — TRACE//ZERO" },
      { name: "description", content: "Sign in or create your private TRACE//ZERO investigation workspace." },
      { property: "og:title", content: "Sign in — TRACE//ZERO" },
      { property: "og:description", content: "Your private digital investigation workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState<null | "form" | "google">(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | "confirm" | "reset">(null);
  const dest = safeRedirect(search.redirect);

  useEffect(() => {
    if (ready && user) void navigate({ to: dest, replace: true });
  }, [ready, user, dest, navigate]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setFormError(null);
    setSent(null);
  };

  const validate = () => {
    const e: Record<string, string | null> = {};
    if (!emailRe.test(email.trim())) e["email"] = "Enter a valid email address.";
    if (mode !== "forgot") {
      if (password.length < 8) e["password"] = "Use at least 8 characters.";
      else if (mode === "signup" && !(/[A-Za-z]/.test(password) && /\d/.test(password))) e["password"] = "Include at least one letter and one number.";
    }
    if (mode === "signup" && name.trim().length > 80) e["name"] = "Keep your name under 80 characters.";
    setErrors(e);
    return Object.values(e).every((v) => !v);
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setBusy("form");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        void navigate({ to: dest, replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (data.session) void navigate({ to: "/onboarding", replace: true });
        else setSent("confirm");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("reset");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setFormError(/invalid login/i.test(msg) ? "That email and password don't match an account." : /network|fetch/i.test(msg) ? "Can't reach the server. Check your connection and try again." : msg);
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setBusy("google");
    setFormError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (result.redirected) return;
      void navigate({ to: dest, replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed.";
      setFormError(msg);
      toast.error("Google sign-in didn't complete", { description: msg });
    } finally {
      setBusy(null);
    }
  };

  const titles: Record<Mode, [string, string]> = {
    signin: ["Welcome back", "Sign in to continue your investigations."],
    signup: ["Open your workspace", "Create a private account. Your investigations stay yours."],
    forgot: ["Reset your password", "We'll email you a secure link to choose a new one."],
  };

  return (
    <div className="ambient grid min-h-dvh bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="dark relative hidden overflow-hidden bg-background text-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grid-lines absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-[30rem] w-[30rem] rounded-full bg-amber/10 blur-[120px]" />
        <Link to="/" className="relative inline-flex items-center gap-3"><LogoMark /><Wordmark /></Link>
        <div className="relative max-w-lg">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
            <LogoMark animate size={72} />
          </motion.div>
          <h2 className="editorial mt-8 text-5xl">Every claim<br />leaves a <span className="text-amber">trail.</span></h2>
          <p className="mt-5 text-muted-foreground">Deconstruct a message. Discover the sources. Examine the evidence. Reach a conclusion you can actually trace.</p>
        </div>
        <ul className="relative grid grid-cols-3 gap-4 text-xs text-muted-foreground">
          {["Cited, real web research", "Private by default", "Transparent confidence"].map((t) => (
            <li key={t} className="border-t border-border pt-3">{t}</li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[25rem]">
          <Link to="/" className="mb-10 inline-flex items-center gap-2.5 lg:hidden"><LogoMark animate /><Wordmark /></Link>
          <AnimatePresence mode="wait">
            <motion.div key={sent ? `sent-${sent}` : mode} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
              {sent ? (
                <div className="surface-card p-7 text-center">
                  <MailCheck className="mx-auto mb-4 size-8 text-amber" />
                  <h1 className="text-xl font-medium tracking-tight">Check your inbox</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {sent === "confirm" ? `We sent a confirmation link to ${email}. Open it to activate your workspace.` : `If an account exists for ${email}, a password reset link is on its way.`}
                  </p>
                  <Button variant="outline" className="mt-6 w-full" onClick={() => switchMode("signin")}>Back to sign in</Button>
                </div>
              ) : (
                <>
                  {mode === "forgot" && (
                    <button onClick={() => switchMode("signin")} className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back</button>
                  )}
                  <h1 className="editorial text-3xl">{titles[mode][0]}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{titles[mode][1]}</p>

                  {mode !== "forgot" && (
                    <>
                      <Button type="button" variant="google" size="lg" className="mt-7 w-full" onClick={google} disabled={busy !== null}>
                        {busy === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />} Continue with Google
                      </Button>
                      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="hairline flex-1" />or with email<span className="hairline flex-1" /></div>
                    </>
                  )}

                  <form onSubmit={submit} className={mode === "forgot" ? "mt-7 space-y-4" : "space-y-4"} noValidate>
                    {mode === "signup" && <Field label="Name (optional)" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors["name"]} maxLength={80} />}
                    <Field label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors["email"]} required />
                    {mode !== "forgot" && (
                      <Field label="Password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} error={errors["password"]} hint={mode === "signup" ? "At least 8 characters, with a letter and a number." : undefined} required />
                    )}
                    {mode === "signin" && (
                      <div className="flex justify-end">
                        <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-muted-foreground hover:text-amber">Forgot password?</button>
                      </div>
                    )}
                    <AnimatePresence>
                      {formError && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-lg border border-ev-contradict/30 bg-ev-contradict/5 px-3 py-2.5 text-sm text-ev-contradict" role="alert">
                          {formError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
                      {busy === "form" && <Loader2 className="animate-spin" />}
                      {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                    </Button>
                  </form>

                  {mode !== "forgot" && (
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                      {mode === "signin" ? "New to TRACE//ZERO? " : "Already have an account? "}
                      <button onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} className="font-medium text-foreground underline-offset-4 hover:text-amber hover:underline">
                        {mode === "signin" ? "Create an account" : "Sign in"}
                      </button>
                    </p>
                  )}
                  <p className="mt-8 text-center text-xs text-muted-foreground">
                    Just looking? <Link to="/demo" className="text-amber hover:underline">Explore the sample investigation</Link> — no account needed.
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
