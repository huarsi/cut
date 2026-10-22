"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { SLUG_LENGTHS } from "@/lib/slug";
import { useT } from "./preferences";

/** Elige cuántos caracteres lleva el código después de la "/", con una vista previa animada. */
export function LengthPicker({
  value,
  onChange,
  host,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  host: string;
  disabled?: boolean;
}) {
  const t = useT();
  const id = useId();

  return (
    <div
      className={`flex items-center gap-2.5 transition-opacity ${disabled ? "pointer-events-none opacity-35" : ""}`}
      title={disabled ? t.form.aliasReplacesLength : t.form.length}
    >
      <span aria-hidden className="flex items-center font-mono text-xs text-muted">
        <span className="hidden sm:inline">{host}</span>/
        <span className="flex">
          <AnimatePresence initial={false} mode="popLayout">
            {Array.from({ length: value }, (_, i) => (
              <motion.span
                key={i}
                layout
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                className="text-accent"
              >
                •
              </motion.span>
            ))}
          </AnimatePresence>
        </span>
      </span>

      <div role="radiogroup" aria-label={t.form.length} className="flex rounded-lg bg-fg/[0.05] p-0.5">
        {SLUG_LENGTHS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={String(n)}
            tabIndex={disabled ? -1 : undefined}
            onClick={() => onChange(n)}
            className="relative h-6 w-7 cursor-pointer rounded-md text-xs font-medium text-muted tabular-nums transition-colors hover:text-fg aria-checked:text-fg"
          >
            {value === n && (
              <motion.span
                layoutId={`length-${id}`}
                className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-line"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{n}</span>
          </button>
        ))}
      </div>
      <input type="hidden" name="length" value={value} />
    </div>
  );
}
