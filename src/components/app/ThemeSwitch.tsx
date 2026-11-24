import { Monitor, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSwitch({ onChange, showLabels = false, className }: { onChange?: (p: ThemePref) => void; showLabels?: boolean; className?: string }) {
  const { pref, setPref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex rounded-lg border border-border bg-surface/60 p-0.5", className)}>
      {OPTIONS.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            onClick={() => {
              setPref(o.value);
              onChange?.(o.value);
            }}
            className={cn(
              "relative flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && <motion.span layoutId={`theme-pill-${showLabels ? "l" : "s"}`} className="absolute inset-0 rounded-md bg-elevated shadow-soft" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
            <o.icon className="relative size-3.5" />
            {showLabels && <span className="relative">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
