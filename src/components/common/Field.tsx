import { useId, useState, type ComponentProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Field({ label, error, hint, type, ...props }: ComponentProps<typeof Input> & { label: string; error?: string | null | undefined; hint?: string | undefined }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input id={id} type={isPassword && visible ? "text" : type} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} className={isPassword ? "pr-11" : undefined} {...props} />
        {isPassword && (
          <button type="button" onClick={() => setVisible((v) => !v)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={visible ? "Hide password" : "Show password"}>
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p key="e" id={`${id}-err`} initial={{ opacity: 0, height: 0, y: -4 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0 }} className="text-xs text-ev-contradict">
            {error}
          </motion.p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
