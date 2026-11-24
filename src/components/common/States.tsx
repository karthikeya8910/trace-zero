import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("relative flex flex-col items-center overflow-hidden rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center", className)}
    >
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
      {icon && <div className="relative mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-elevated text-amber">{icon}</div>}
      <h3 className="relative text-lg font-medium tracking-tight">{title}</h3>
      {description && <p className="relative mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="relative mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-ev-contradict/30 bg-ev-contradict/5 px-6 py-10 text-center" role="alert">
      <AlertTriangle className="mb-3 size-6 text-ev-contradict" />
      <h3 className="font-medium">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="surface-card space-y-3 p-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i % 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function Panel({ children, className, title, eyebrow, actions }: { children: ReactNode; className?: string; title?: ReactNode; eyebrow?: string; actions?: ReactNode }) {
  return (
    <section className={cn("surface-card print-plain p-5 sm:p-6", className)}>
      {(title || eyebrow || actions) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
            {title && <h2 className="text-base font-medium tracking-tight">{title}</h2>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
