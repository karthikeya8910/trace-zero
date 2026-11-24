import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { BootScreen } from "@/components/brand/BootScreen";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/_workspace")({
  beforeLoad: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(profileQuery(context.user.id)).catch(() => null);
    if (profile && !profile.onboarded_at) throw redirect({ to: "/onboarding" });
  },
  pendingComponent: () => <BootScreen />,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
