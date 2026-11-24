import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Sample investigation — TRACE//ZERO" }] }),
  component: () => <div className="p-10">Sample investigation (not finished yet).</div>,
});
