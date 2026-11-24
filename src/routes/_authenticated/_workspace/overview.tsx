import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/app/AppShell";
export const Route = createFileRoute("/_authenticated/_workspace/overview")({
  head: () => ({ meta: [{ title: "overview — TRACE//ZERO" }] }),
  component: () => <Page><PageHeader eyebrow="TRACE//ZERO" title="overview" description="This section is not finished yet." /></Page>,
});
