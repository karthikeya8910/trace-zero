import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Link2, Loader2, Type } from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/app/AppShell";
import { Panel } from "@/components/common/States";
import { Field } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createInvestigation } from "@/lib/investigations.functions";

export const Route = createFileRoute("/_authenticated/_workspace/investigate")({
  head: () => ({ meta: [{ title: "New investigation — TRACE//ZERO" }] }),
  component: Investigate,
});

type Mode = "text" | "url" | "image";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function Investigate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = mode === "text" ? text.trim().length >= 12 : mode === "url" ? url.trim().length >= 4 : Boolean(file);

  const pickFile = (f: File | undefined) => {
    setError(null);
    if (!f) return setFile(null);
    if (!EXT[f.type]) return setError("Use a PNG, JPEG or WebP screenshot.");
    if (f.size > MAX_IMAGE_BYTES) return setError("That image is over 8 MB. Use a smaller screenshot.");
    setFile(f);
  };

  const submit = async () => {
    if (!user || !ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      let input: Parameters<typeof createInvestigation>[0]["data"];
      if (mode === "text") input = { inputType: "text", text };
      else if (mode === "url") input = { inputType: "url", url };
      else {
        const path = `${user.id}/${crypto.randomUUID()}.${EXT[file!.type]}`;
        const { error: upErr } = await supabase.storage.from("submissions").upload(path, file!, { contentType: file!.type, upsert: false });
        if (upErr) throw new Error("The screenshot could not be uploaded. Check your connection and try again.");
        input = { inputType: "image", filePath: path, ...(note.trim() ? { note: note.trim() } : {}) };
      }
      const res = await createInvestigation({ data: input });
      await qc.invalidateQueries({ queryKey: ["investigations"] });
      if (res.duplicate) toast.info("You already submitted this a moment ago. Opening it.");
      void navigate({ to: "/investigations/$id", params: { id: res.id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Try again.";
      setError(msg);
      toast.error("Investigation not started", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="max-w-3xl">
      <PageHeader title="What do you want to trace?" description="Submit a message, a link or a screenshot. TRACE//ZERO breaks it into claims, you review them, then it researches each one." />
      <Panel className="mt-8">
        <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setError(null); }}>
          <TabsList className="flex h-auto justify-start gap-1 bg-transparent p-0">
            {([["text", "Text", Type], ["url", "Link", Link2], ["image", "Screenshot", ImageIcon]] as const).map(([v, label, Icon]) => (
              <TabsTrigger key={v} value={v} className="gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs data-[state=active]:border-amber/50 data-[state=active]:bg-amber-soft data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground">
                <Icon className="size-3.5" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="text" className="mt-5 space-y-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={20000} rows={9} placeholder="Paste the message, post or article text here." aria-label="Text to investigate" />
            <p className="text-right text-xs text-muted-foreground">{text.length.toLocaleString()} / 20,000</p>
          </TabsContent>

          <TabsContent value="url" className="mt-5">
            <Field label="Web address" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.org/article" hint="Public pages only. Links to private or local networks are blocked." />
          </TabsContent>

          <TabsContent value="image" className="mt-5 space-y-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong px-4 py-10 text-center text-sm text-muted-foreground hover:border-amber/50">
              <ImageIcon className="size-6 text-amber" />
              <span className="font-medium text-foreground">{file ? file.name : "Choose a screenshot"}</span>
              <span className="text-xs">{file ? `${(file.size / 1024).toFixed(0)} KB` : "PNG, JPEG or WebP, up to 8 MB"}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} placeholder="Optional: where did you see this?" aria-label="Context note" />
          </TabsContent>
        </Tabs>

        {error && <p role="alert" className="mt-4 rounded-lg border border-ev-contradict/30 bg-ev-contradict/5 px-3 py-2.5 text-sm text-ev-contradict">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Your submission stays private to your account.</p>
          <Button variant="signal" size="lg" onClick={submit} disabled={!ready || busy}>
            {busy && <Loader2 className="animate-spin" />} Start investigation
          </Button>
        </div>
      </Panel>
    </Page>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/app/AppShell";
export const Route = createFileRoute("/_authenticated/_workspace/investigate")({
  head: () => ({ meta: [{ title: "investigate — TRACE//ZERO" }] }),
  component: () => <Page><PageHeader eyebrow="TRACE//ZERO" title="investigate" description="This section is not finished yet." /></Page>,
});
