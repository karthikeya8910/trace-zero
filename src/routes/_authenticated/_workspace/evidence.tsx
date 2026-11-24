import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/app/AppShell";
export const Route = createFileRoute("/_authenticated/_workspace/evidence")({
  head: () => ({ meta: [{ title: "evidence — TRACE//ZERO" }] }),
  component: () => <Page><PageHeader eyebrow="TRACE//ZERO" title="evidence" description="This section is not finished yet." /></Page>,
});
