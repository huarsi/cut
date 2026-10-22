"use client";

import { motion } from "motion/react";
import { useTransition } from "react";
import { claimAnonLinksAction } from "./actions";

export function ClaimBanner({ count }: { count: number }) {
  const [pending, start] = useTransition();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4 sm:flex-row sm:items-center"
    >
      <p className="flex-1 text-sm">
        Tienes <strong>{count}</strong> {count === 1 ? "link que creaste" : "links que creaste"} sin cuenta
        en este navegador. Pásalos a tu cuenta para ver sus clics y administrarlos.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => claimAnonLinksAction())}
        className="btn-primary h-9 px-4 text-sm"
      >
        {pending ? "Pasando…" : count === 1 ? "Pasarlo a mi cuenta" : "Pasarlos a mi cuenta"}
      </button>
    </motion.div>
  );
}
