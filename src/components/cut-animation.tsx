"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { displayUrl } from "@/lib/format";

type Phase = "long" | "cut" | "short";

/**
 * Muestra el link largo, lo "corta" con una línea del color de acento,
 * deja caer el sobrante y escribe el link corto.
 */
export function CutAnimation({ from, to }: { from: string; to: string }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("long");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("cut"), reduce ? 0 : 450);
    const t2 = setTimeout(() => setPhase("short"), reduce ? 0 : 1250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduce]);

  const long = displayUrl(from);
  const cutAt = Math.min(long.length, Math.max(long.indexOf("/") + 1, 10));
  const head = long.slice(0, cutAt);
  const tail = long.slice(cutAt);
  const short = displayUrl(to);

  return (
    <div className="relative flex h-8 items-center overflow-hidden font-mono text-[15px] sm:text-base">
      <AnimatePresence mode="wait" initial={false}>
        {phase !== "short" ? (
          <motion.div
            key="long"
            className="flex items-center whitespace-nowrap [mask-image:linear-gradient(to_right,black_80%,transparent)]"
            exit={{ opacity: 0, x: -6, transition: { duration: 0.18 } }}
          >
            <span>{head}</span>
            <motion.span
              aria-hidden
              className="mx-0.5 inline-block h-6 w-[2px] rounded-full bg-accent shadow-[0_0_12px_var(--accent)]"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={phase === "cut" ? { scaleY: 1, opacity: 1 } : {}}
              transition={{ type: "spring", stiffness: 700, damping: 30 }}
            />
            <motion.span
              className="inline-block text-muted"
              animate={phase === "cut" ? { y: 22, rotate: 5, opacity: 0 } : {}}
              transition={{ delay: 0.25, duration: 0.45, ease: [0.5, 0, 0.75, 0] }}
            >
              {tail}
            </motion.span>
          </motion.div>
        ) : (
          <motion.div key="short" className="flex whitespace-nowrap">
            {short.split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: i * 0.025, duration: 0.3 }}
                className={i >= short.lastIndexOf("/") + 1 ? "font-semibold" : "text-muted"}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
