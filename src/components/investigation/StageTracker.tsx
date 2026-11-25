import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { STAGES, isProcessing } from "@/lib/domain";
import { cn } from "@/lib/utils";

/** Vertical pipeline tracker for a running investigation. */
export function StageTracker({ status, events }: { status: string; events: { id: string; stage: string; description: string; created_at: string }[] }) {
  const currentIdx = STAGES.findIndex((s) => s.key === status);
  const active = isProcessing(status);
  return (
    <div className="space-y-1">
      {STAGES.map((stage, i) => {
        const done = active ? i < currentIdx : true;
        const current = active && i === currentIdx;
        const last = [...events].reverse().find((e) => e.stage.startsWith(stage.key.slice(0, -3)));
        return (
          <div key={stage.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-[0.65rem]",
                  done && "border-ev-support/40 bg-ev-support/10 text-ev-support",
                  current && "border-amber/50 bg-amber-soft text-amber",
                  !done && !current && "border-border text-muted-foreground",
                )}
              >
                {current && <span className="tz-pulse-ring absolute inset-0 rounded-full border border-amber/40" />}
                {done ? <Check className="size-3.5" /> : current ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
              </div>
              {i < STAGES.length - 1 && <div className={cn("w-px flex-1", done ? "bg-ev-support/40" : "bg-border")} />}
            </div>
            <div className="pb-7 pt-1">
              <p className={cn("text-sm font-medium", !done && !current && "text-muted-foreground")}>{stage.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{current ? stage.line : done ? "Complete" : "Waiting"}</p>
              {current && last && (
                <motion.p key={last.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 max-w-md rounded-lg border border-border bg-surface/60 px-3 py-2 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
                  {last.description}
                </motion.p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
