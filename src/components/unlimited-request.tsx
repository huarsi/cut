"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { requestUnlimitedAction } from "@/app/dashboard/actions";
import type { UnlimitedStatus } from "@/lib/support";
import { useT } from "./preferences";

/** Botón para pedir una cuenta ilimitada, con un mensaje opcional. Crea un ticket para moderación. */
export function UnlimitedRequest({ initialStatus }: { initialStatus: UnlimitedStatus }) {
  const t = useT();
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  if (status === "unlimited") return <p className="text-sm text-muted">{t.unlimited.active}</p>;
  if (status === "pending") return <p className="text-sm text-muted">{t.unlimited.pending}</p>;

  return (
    <div>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost h-9 px-4 text-sm">
          {t.unlimited.request}
        </button>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => setStatus(await requestUnlimitedAction(message)));
            }}
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={1000}
              autoFocus
              placeholder={t.unlimited.messagePlaceholder}
              className="input h-auto py-2.5 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button disabled={pending} className="btn-primary h-9 px-4 text-sm">
                {pending ? t.unlimited.sending : t.unlimited.send}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer px-3 text-sm text-muted transition hover:text-fg"
              >
                {t.unlimited.cancel}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
