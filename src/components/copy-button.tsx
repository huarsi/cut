"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Check, Copy } from "./icons";

export function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copiado" : "Copiar"}
      className={`relative grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-fg/5 hover:text-fg ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? "check" : "copy"}
          initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          className={copied ? "text-accent" : ""}
        >
          {copied ? <Check /> : <Copy />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
