import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsLeft, LogOut, Menu, Plus, Settings, Sparkles, LayoutDashboard, FolderSearch, FileText } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV } from "./nav";
import { ThemeSwitch } from "./ThemeSwitch";
import { useAuth, signOutEverywhere } from "@/lib/auth";
import { profileQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await signOutEverywhere(qc);
    void navigate({ to: "/auth", replace: true });
  };
}

function NavLinks({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map((item) => {
        const active = pathname === item.to || (item.to !== "/overview" && pathname.startsWith(`${item.to}/`));
        const link = (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
            aria-current={active ? "page" : undefined}
          >
            {active && (
              <motion.span layoutId={onNavigate ? "nav-active-m" : "nav-active"} className="absolute inset-0 rounded-lg border border-border bg-sidebar-accent" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />
            )}
            {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-amber" />}
            <item.icon className={cn("relative size-[1.05rem] shrink-0", active && "text-amber")} />
            {!collapsed && <span className="relative truncate">{item.label}</span>}
          </Link>
        );
        return collapsed ? (
          <Tooltip key={item.to}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ) : (
          link
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const { data: profile } = useQuery({ ...profileQuery(user?.id ?? "none"), enabled: Boolean(user) });
  const signOut = useSignOut();
  const name = profile?.display_name || user?.email?.split("@")[0] || "Investigator";
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface/60 pl-1 pr-3 text-sm transition-colors hover:border-border-strong" aria-label="Account menu">
          <span className="flex size-7 items-center justify-center rounded-full bg-amber-soft font-mono text-[0.65rem] font-medium text-amber">{initials}</span>
          <span className="hidden max-w-[9rem] truncate sm:block">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings"><Settings /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/demo"><Sparkles /> Sample investigation</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const MOBILE_TABS = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/investigations", label: "Cases", icon: FolderSearch },
  { to: "/investigate", label: "New", icon: Plus },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setCollapsed(localStorage.getItem("tz.sidebar") === "collapsed"), []);
  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("tz.sidebar", c ? "open" : "collapsed");
      return !c;
    });
  };

  return (
    <div className="ambient min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 256 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl lg:flex"
      >
        <div className={cn("flex h-16 items-center px-5", collapsed && "justify-center px-0")}>
          <Link to="/overview" aria-label="TRACE//ZERO overview">{collapsed ? <LogoMark /> : <Logo />}</Link>
        </div>
        <div className={cn("px-3 pb-3", collapsed && "px-3")}>
          <Button asChild variant="signal" className={cn("w-full", collapsed && "px-0")}>
            <Link to="/investigate" aria-label="Start investigation"><Plus />{!collapsed && "Start investigation"}</Link>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks collapsed={collapsed} />
        </div>
        <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex flex-col items-center gap-2")}>
          {!collapsed && (
            <Link to="/demo" className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-amber/40 hover:text-foreground">
              <Sparkles className="size-3.5 text-amber" /> Explore the sample investigation
            </Link>
          )}
          <Button variant="ghost" size={collapsed ? "icon" : "sm"} onClick={toggle} className={cn("text-muted-foreground", !collapsed && "w-full justify-start")} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <ChevronsLeft className={cn("transition-transform", collapsed && "rotate-180")} />
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </motion.aside>

      <div className={cn("flex min-h-dvh flex-col transition-[padding] duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        {/* Top bar */}
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/75 px-4 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <Link to="/overview" className="lg:hidden" aria-label="Overview"><Logo compact /></Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitch className="hidden sm:inline-flex" />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Quick navigation">
        {MOBILE_TABS.map((t) => {
          const active = pathname === t.to || pathname.startsWith(`${t.to}/`);
          return (
            <Link key={t.to} to={t.to} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem]", active ? "text-amber" : "text-muted-foreground")}>
              {t.to === "/investigate" ? (
                <span className="flex size-9 items-center justify-center rounded-full bg-amber text-background shadow-glow"><t.icon className="size-4" /></span>
              ) : (
                <t.icon className="size-5" />
              )}
              {t.to !== "/investigate" && t.label}
            </Link>
          );
        })}
        <button onClick={() => setMobileOpen(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem] text-muted-foreground">
          <Menu className="size-5" /> More
        </button>
      </nav>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-xs border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center px-5"><Logo /></div>
          <div className="px-3"><NavLinks onNavigate={() => setMobileOpen(false)} /></div>
          <div className="mt-6 space-y-3 border-t border-sidebar-border p-4">
            <p className="eyebrow">Appearance</p>
            <ThemeSwitch showLabels />
            <Link to="/demo" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-amber" /> Sample investigation
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="editorial text-3xl sm:text-4xl lg:text-[2.75rem]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10", className)}>{children}</div>;
}
