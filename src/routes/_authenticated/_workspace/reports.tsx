import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/app/AppShell";
export const Route = createFileRoute("/_authenticated/_workspace/reports")({
  head: () => ({ meta: [{ title: "reports — TRACE//ZERO" }] }),
  component: () => <Page><PageHeader eyebrow="TRACE//ZERO" title="reports" description="This section is not finished yet." /></Page>,
});
