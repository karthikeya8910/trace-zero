import { LogoMark } from "./Logo";

/** Shown while the session and workspace are genuinely initialising. */
export function BootScreen({ label = "Opening your workspace" }: { label?: string }) {
  return (
    <div className="ambient flex min-h-dvh flex-col items-center justify-center gap-5 bg-background" role="status" aria-live="polite">
      <div className="relative">
        <span className="tz-pulse-ring absolute inset-0 rounded-full border border-amber/40" />
        <LogoMark size={44} className="relative text-foreground" />
      </div>
      <p className="eyebrow">{label}</p>
    </div>
  );
}
