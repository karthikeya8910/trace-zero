import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/common/Field";
import { LogoMark, Wordmark } from "@/components/brand/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — TRACE//ZERO" },
      { name: "description", content: "Set a new password for your TRACE//ZERO account." },
      { property: "og:title", content: "Choose a new password — TRACE//ZERO" },
      { property: "og:description", content: "Set a new password for your TRACE//ZERO account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady("ok");
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecovery) setReady("ok");
      else if (data.session) setReady("ok");
      else window.setTimeout(() => setReady((r) => (r === "checking" ? "invalid" : r)), 2500);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Use at least 8 characters, with a letter and a number.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    toast.success("Password updated");
    void navigate({ to: "/overview", replace: true });
  };

  return (
    <div className="ambient flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 inline-flex items-center gap-2.5"><LogoMark /><Wordmark /></Link>
        <div className="surface-card p-7">
          <KeyRound className="mb-4 size-6 text-amber" />
          <h1 className="text-xl font-medium tracking-tight">Choose a new password</h1>
          {ready === "checking" && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Verifying your reset link…</p>}
          {ready === "invalid" && (
            <>
              <p className="mt-3 text-sm text-muted-foreground">This reset link is invalid or has expired. Request a new one.</p>
              <Button asChild variant="outline" className="mt-5 w-full"><Link to="/auth" search={{ mode: "forgot" }}>Request a new link</Link></Button>
            </>
          )}
          {ready === "ok" && (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} error={error} />
              <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Update password</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
