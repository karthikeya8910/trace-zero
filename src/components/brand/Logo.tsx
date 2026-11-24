import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** TRACE//ZERO symbol: an orbit (the trail), a crosshair gap and a zero-point core. */
export function LogoMark({ className, animate = false, size = 28 }: { className?: string; animate?: boolean; size?: number }) {
  const reduce = useReducedMotion();
  const draw = animate && !reduce;
  const t = (d: number) => (draw ? { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] as const } : { duration: 0 });
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={cn("shrink-0", className)} aria-hidden="true" fill="none">
      <motion.circle
        cx="20" cy="20" r="16.5" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25"
        initial={draw ? { pathLength: 0, rotate: -90 } : false} animate={{ pathLength: 1, rotate: 0 }} transition={t(0)}
        style={{ originX: "50%", originY: "50%" }}
      />
      <motion.path
        d="M20 3.5 A16.5 16.5 0 0 1 36.5 20" stroke="var(--amber)" strokeWidth="1.75" strokeLinecap="round"
        initial={draw ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={t(0.25)}
      />
      <motion.path
        d="M14.5 25.5 L19 14.5 M21 25.5 L25.5 14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
        initial={draw ? { pathLength: 0, opacity: 0 } : false} animate={{ pathLength: 1, opacity: 1 }} transition={t(0.45)}
      />
      <motion.circle
        cx="20" cy="20" r="2" fill="var(--amber)"
        initial={draw ? { scale: 0 } : false} animate={{ scale: 1 }} transition={t(0.8)}
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono text-[0.8rem] font-medium tracking-[0.22em]", className)}>
      TRACE<span className="text-amber">//</span>ZERO
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <LogoMark />
      {!compact && <Wordmark />}
    </span>
  );
}
