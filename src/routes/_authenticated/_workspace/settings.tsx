import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/app/AppShell";
export const Route = createFileRoute("/_authenticated/_workspace/settings")({
  head: () => ({ meta: [{ title: "settings — TRACE//ZERO" }] }),
  component: () => <Page><PageHeader eyebrow="TRACE//ZERO" title="settings" description="This section is not finished yet." /></Page>,
});
