import { createFileRoute, Link } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/onboarding")({
  component: () => <div className="p-10"><Link to="/overview">Continue</Link></div>,
});
