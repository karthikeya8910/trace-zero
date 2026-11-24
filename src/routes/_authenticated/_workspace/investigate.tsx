import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/app/AppShell";
export const Route = createFileRoute("/_authenticated/_workspace/investigate")({
  head: () => ({ meta: [{ title: "investigate — TRACE//ZERO" }] }),
  component: () => <Page><PageHeader eyebrow="TRACE//ZERO" title="investigate" description="This section is not finished yet." /></Page>,
});
