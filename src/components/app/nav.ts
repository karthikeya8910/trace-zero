import { LayoutDashboard, Plus, FolderSearch, Network, Swords, FileText, Settings, type LucideIcon } from "lucide-react";

export const NAV: { to: "/overview" | "/investigate" | "/investigations" | "/evidence" | "/duel" | "/reports" | "/settings"; label: string; icon: LucideIcon }[] = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/investigate", label: "New Investigation", icon: Plus },
  { to: "/investigations", label: "Investigations", icon: FolderSearch },
  { to: "/evidence", label: "Evidence Room", icon: Network },
  { to: "/duel", label: "Source Duel", icon: Swords },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];
