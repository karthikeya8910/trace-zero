import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BootScreen } from "@/components/brand/BootScreen";

// Client-only gate: the session lives in browser storage. Data access is enforced separately
// by row-level security and authenticated server functions on every request.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/auth", search: { redirect: location.pathname } });
    return { user };
  },
  pendingComponent: () => <BootScreen />,
  pendingMs: 150,
  component: () => <Outlet />,
});
