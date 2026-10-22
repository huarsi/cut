"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Check } from "./icons";
import { useT } from "./preferences";

export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

/** Input de usuario que revisa en vivo si está disponible. */
export function UsernameField({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const t = useT();
  const messages: Partial<Record<Status, string>> = { taken: t.username.taken, invalid: t.username.invalid };
  const [checked, setChecked] = useState<{ value: string; available: boolean } | null>(null);

  useEffect(() => {
    if (!USERNAME_PATTERN.test(value)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await authClient.isUsernameAvailable({ username: value });
      if (!cancelled && data) setChecked({ value, available: data.available });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  const status: Status = !value
    ? "idle"
    : !USERNAME_PATTERN.test(value)
      ? "invalid"
      : checked?.value !== value
        ? "checking"
        : checked.available
          ? "available"
          : "taken";

  return (
    <div className={className}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">@</span>
        <input
          name="username"
          required
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={t.username.placeholder}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
          aria-invalid={status === "taken" || status === "invalid"}
          className="input pr-10 pl-8"
        />
        <span className="absolute top-1/2 right-3.5 -translate-y-1/2">
          <AnimatePresence mode="popLayout" initial={false}>
            {status === "checking" && (
              <motion.span
                key="checking"
                className="block size-3.5 rounded-full border-2 border-muted/40 border-t-fg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ rotate: { repeat: Infinity, duration: 0.7, ease: "linear" } }}
              />
            )}
            {status === "available" && (
              <motion.span
                key="ok"
                className="block text-emerald-500"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Check width={16} height={16} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>
      <AnimatePresence initial={false}>
        {messages[status] && (
          <motion.p
            key={status}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-1 pt-1.5 text-xs text-danger"
          >
            {messages[status]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
