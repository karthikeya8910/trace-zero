import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FolderSearch, Globe, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/app/AppShell";
import { EmptyState, ErrorState, CardSkeleton, Panel } from "@/components/common/States";
import { InvestigationView } from "@/components/investigation/InvestigationView";
import { StageTracker } from "@/components/investigation/StageTracker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CLAIM_TYPES, CLAIM_TYPE_LABEL, isProcessing, type ClaimType, type InvestigationBundle } from "@/lib/domain";
import { bundleQuery } from "@/lib/queries";
import { advanceInvestigation, cancelInvestigation, confirmClaims, deleteInvestigation, retryInvestigation } from "@/lib/investigations.functions";
import { setReportPublic } from "@/lib/workspace.functions";

export const Route = createFileRoute("/_authenticated/_workspace/investigations_/$id")({
  head: () => ({ meta: [{ title: "Investigation — TRACE//ZERO" }] }),
  component: Detail,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

function Detail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["bundle", id] });
  const q = useQuery({ ...bundleQuery(id), retry: false });
  const status = q.data?.investigation.status;
  const running = Boolean(status && isProcessing(status));
  const [stepError, setStepError] = useState<string | null>(null);

  // Drives the pipeline: one server call per step until the investigation leaves a processing stage.
  useEffect(() => {
    if (!running) return;
    let stop = false;
    setStepError(null);
    void (async () => {
      while (!stop) {
        try {
          const res = await advanceInvestigation({ data: { id } });
          await refresh();
          if (!isProcessing(res.status)) break;
          if (res.busy) await sleep(2500);
        } catch (e) {
          if (!stop) setStepError(msg(e));
          break;
        }
      }
    })();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, id]);

  if (q.isPending) return <Page className="max-w-4xl"><CardSkeleton rows={6} /></Page>;
  if (q.error?.message === "NOT_FOUND")
    return (
      <Page className="max-w-4xl">
        <EmptyState icon={<FolderSearch className="size-5" />} title="Investigation not found" description="It may have been deleted, or it belongs to another account." action={<Button asChild variant="outline"><Link to="/investigations">Back to investigations</Link></Button>} />
      </Page>
    );
  if (q.error || !q.data) return <Page className="max-w-4xl"><ErrorState message={q.error?.message} onRetry={() => void q.refetch()} /></Page>;

  const bundle = q.data;
  const inv = bundle.investigation;

  return (
    <Page className="max-w-4xl">
      {inv.status === "completed" ? (
        <Completed bundle={bundle} onChange={refresh} />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="editorial text-3xl">{inv.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{inv.status === "awaiting_review" ? "Check the claims before research starts." : inv.status === "failed" ? "This investigation stopped." : inv.status === "cancelled" ? "This investigation was cancelled." : "Research is running. You can leave this page open or come back later."}</p>
          </div>
          {inv.status === "awaiting_review" && <Review bundle={bundle} onDone={refresh} />}
          {running && (
            <Panel title="Progress" actions={<Button variant="outline" size="sm" onClick={() => void cancelInvestigation({ data: { id } }).then(refresh).catch((e) => toast.error(msg(e)))}>Cancel</Button>}>
              <StageTracker status={inv.status} events={bundle.events} />
              {stepError && <p role="alert" className="mt-3 text-sm text-ev-contradict">{stepError} Reload the page to resume.</p>}
            </Panel>
          )}
          {(inv.status === "failed" || inv.status === "cancelled") && (
            <ErrorState title={inv.status === "failed" ? "The investigation failed" : "Cancelled"} message={inv.error_message ?? "Progress so far is saved. You can resume from where it stopped."} onRetry={() => void retryInvestigation({ data: { id } }).then(refresh).catch((e) => toast.error(msg(e)))} />
          )}
        </div>
      )}
    </Page>
  );
}

type Draft = { key: string; id?: string; text: string; type: ClaimType };

function Review({ bundle, onDone }: { bundle: InvestigationBundle; onDone: () => unknown }) {
  const [drafts, setDrafts] = useState<Draft[]>(() => bundle.claims.map((c) => ({ key: c.id, id: c.id, text: c.claim_text, type: c.claim_type as ClaimType })));
  const [busy, setBusy] = useState(false);
  const patch = (key: string, p: Partial<Draft>) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const valid = drafts.length >= 1 && drafts.every((d) => d.text.trim().length >= 3);

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmClaims({ data: { id: bundle.investigation.id, claims: drafts.map((d) => ({ ...(d.id ? { id: d.id } : {}), text: d.text.trim(), type: d.type })) } });
      await onDone();
    } catch (e) {
      toast.error("Claims not confirmed", { description: msg(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Review the claims" actions={<span className="text-xs text-muted-foreground">{drafts.length} of 10</span>}>
      <p className="mb-4 text-sm text-muted-foreground">Edit wording, change a claim's type, or remove anything that isn't a claim. Only factual claims are fact-checked.</p>
      <ul className="space-y-3">
        {drafts.map((d) => (
          <li key={d.key} className="rounded-lg border border-border bg-surface/50 p-3">
            <Textarea value={d.text} maxLength={1000} rows={2} onChange={(e) => patch(d.key, { text: e.target.value })} aria-label="Claim text" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <select value={d.type} onChange={(e) => patch(d.key, { type: e.target.value as ClaimType })} aria-label="Claim type" className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                {CLAIM_TYPES.map((t) => <option key={t} value={t}>{CLAIM_TYPE_LABEL[t]}</option>)}
              </select>
              <Button variant="ghost" size="sm" disabled={drafts.length === 1} onClick={() => setDrafts((x) => x.filter((c) => c.key !== d.key))}><X /> Remove</Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" disabled={drafts.length >= 10} onClick={() => setDrafts((x) => [...x, { key: crypto.randomUUID(), text: "", type: "factual" }])}><Plus /> Add a claim</Button>
        <Button variant="signal" onClick={confirm} disabled={!valid || busy}>{busy && <Loader2 className="animate-spin" />} Confirm and start research</Button>
      </div>
    </Panel>
  );
}

function Completed({ bundle, onChange }: { bundle: InvestigationBundle; onChange: () => unknown }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inv = bundle.investigation;
  const report = bundle.report;
  const [busy, setBusy] = useState(false);
  const shareUrl = report?.is_public && report.public_token ? `${window.location.origin}/report/${report.public_token}` : null;

  const toggleShare = async () => {
    setBusy(true);
    try {
      await setReportPublic({ data: { id: inv.id, makePublic: !report?.is_public } });
      await onChange();
      toast.success(report?.is_public ? "Link turned off" : "Public link created");
    } catch (e) {
      toast.error("Sharing not changed", { description: msg(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this investigation, its sources and any uploaded screenshot? This can't be undone.")) return;
    try {
      await deleteInvestigation({ data: { id: inv.id } });
      await qc.invalidateQueries({ queryKey: ["investigations"] });
      void navigate({ to: "/investigations" });
    } catch (e) {
      toast.error("Not deleted", { description: msg(e) });
    }
  };

  return (
    <InvestigationView
      bundle={bundle}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={toggleShare} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Globe />} {report?.is_public ? "Turn off public link" : "Create public link"}</Button>
          {shareUrl && <Button variant="secondary" size="sm" onClick={() => void navigator.clipboard.writeText(shareUrl).then(() => toast.success("Link copied"))}><Copy /> Copy link</Button>}
          <Button variant="ghost" size="sm" onClick={remove}><Trash2 /> Delete</Button>
        </>
      }
    />
  );
}
