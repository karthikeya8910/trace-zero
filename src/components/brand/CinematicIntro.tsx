import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoMark } from "./Logo";

const FLAG = "tz.intro.v1";

/**
 * First-visit introduction (~1.8s). Overlays the already-rendered app, so it never delays loading.
 * Skipped for returning visitors, reduced-motion users and public report links.
 */
export function CinematicIntro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const pending = root.classList.contains("tz-intro-pending");
    if (!pending) return;
    setShow(true);
    localStorage.setItem(FLAG, String(Date.now()));
    const raf = requestAnimationFrame(() => root.classList.remove("tz-intro-pending"));
    const done = window.setTimeout(() => setShow(false), 1900);
    const skip = (e: KeyboardEvent) => e.key === "Escape" && setShow(false);
    window.addEventListener("keydown", skip);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          className="dark fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-background text-foreground"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setShow(false)}
          role="presentation"
        >
          {/* amber light */}
          <motion.div
            className="pointer-events-none absolute h-[38rem] w-[38rem] rounded-full bg-amber/20 blur-[120px]"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          {/* scanning line */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent"
            initial={{ top: "-2%", opacity: 0 }}
            animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.05, ease: [0.65, 0, 0.35, 1], delay: 0.1 }}
          />
          <div className="relative flex flex-col items-center gap-5">
            <LogoMark animate size={64} className="text-foreground" />
            <motion.div
              initial={{ opacity: 0, y: 8, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.28em" }}
              transition={{ duration: 0.7, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="font-mono text-lg font-medium sm:text-2xl"
            >
              TRACE<span className="text-amber">//</span>ZERO
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.95 }}
              className="text-sweep text-sm tracking-wide sm:text-base"
            >
              Every claim leaves a trail.
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
