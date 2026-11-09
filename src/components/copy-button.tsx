"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Cross } from "./icons";
import { useT } from "./preferences";

type Status = "idle" | "copied" | "failed";

/** Copia con la API del portapapeles y, si el navegador no la permite, con el método antiguo. */
async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Sin HTTPS, sin permiso o en navegadores viejos: se copia desde un campo temporal.
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      field.remove();
    }
  }
}

export function CopyButton({ value, className = "" }: { value: string; className?: string }) {
  const t = useT();
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    const ok = await copyText(value);
    setStatus(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), ok ? 1400 : 3000);
  }

  const label = status === "copied" ? t.form.copied : status === "failed" ? t.form.copyFailed : t.form.copy;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={status === "failed" ? t.form.copyFailed : undefined}
      className={`relative grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-fg/5 hover:text-fg ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
          className={status === "copied" ? "text-accent" : status === "failed" ? "text-danger" : ""}
        >
          {status === "copied" ? <Check /> : status === "failed" ? <Cross /> : <Copy />}
        </motion.span>
      </AnimatePresence>
      {/* Si no se pudo copiar, se dice por qué y qué hacer. */}
      <AnimatePresence>
        {status === "failed" && (
          <motion.span
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute top-full right-0 z-20 mt-1.5 w-max max-w-56 rounded-lg bg-fg px-2.5 py-1.5 text-left text-xs text-bg shadow-lg"
          >
            {t.form.copyFailed}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
