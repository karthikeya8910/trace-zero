import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeSwitch } from "@/components/app/ThemeSwitch";
import { Button } from "@/components/ui/button";
import { InvestigationView } from "@/components/investigation/InvestigationView";
import { getPublicReport } from "@/lib/public-report.functions";
import { bundleFromPublic } from "@/lib/queries";

export const Route = createFileRoute("/report/$token")({
  loader: async ({ params }) => {
    const payload = await getPublicReport({ data: { token: params.token } }).catch(() => null);
    if (!payload) throw notFound();
    return { payload };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${String(loaderData.payload.investigation["title"] ?? "Shared report")} — TRACE//ZERO` : "Report unavailable — TRACE//ZERO";
    return {
      meta: [
        { title },
        { name: "description", content: "A read-only investigation report shared from TRACE//ZERO." },
        { property: "og:title", content: title },
        { property: "og:description", content: "A read-only investigation report shared from TRACE//ZERO." },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Lock className="size-6 text-amber" />
      <h1 className="editorial text-3xl">This report isn't available</h1>
      <p className="max-w-md text-sm text-muted-foreground">The link may be wrong, or its owner turned off public access.</p>
      <Button asChild variant="outline"><Link to="/">Go to TRACE//ZERO</Link></Button>
    </div>
  ),
  component: PublicReport,
});

function PublicReport() {
  const { payload } = Route.useLoaderData();
  const bundle = bundleFromPublic(payload);
  return (
    <div className="min-h-screen bg-background">
      <header className="no-print border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3"><Link to="/"><Logo /></Link><ThemeSwitch /></div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">
        <p className="no-print mb-6 text-xs text-muted-foreground">Read-only shared report. The original submission is not included.</p>
        <InvestigationView bundle={bundle} defaultTab="report" actions={<Button size="sm" variant="outline" className="no-print" onClick={() => window.print()}>Print / save as PDF</Button>} />
      </main>
    </div>
  );
}
