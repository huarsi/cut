"use client";

import { motion } from "motion/react";
import { useTransition } from "react";
import { useT } from "@/components/preferences";
import { claimAnonLinksAction } from "./actions";

export function ClaimBanner({ count }: { count: number }) {
  const t = useT();
  const [pending, start] = useTransition();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4 sm:flex-row sm:items-center"
    >
      <p className="flex-1 text-sm">{t.claim.text(count)}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => claimAnonLinksAction())}
        className="btn-primary h-9 px-4 text-sm"
      >
        {pending ? t.claim.pending : t.claim.button(count)}
      </button>
    </motion.div>
  );
}
