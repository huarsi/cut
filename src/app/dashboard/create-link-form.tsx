"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { CutAnimation } from "@/components/cut-animation";
import { Scissors } from "@/components/icons";
import { createLinkAction, type CreateLinkState } from "./actions";

export function CreateLinkForm({ defaultUrl }: { defaultUrl: string }) {
  // El input es controlado para conservar lo escrito si hay error y limpiarlo solo al tener éxito.
  const [url, setUrl] = useState(defaultUrl);
  const [showSlug, setShowSlug] = useState(false);
  const [state, action, pending] = useActionState<CreateLinkState, FormData>(async (prev, form) => {
    const result = await createLinkAction(prev, form);
    if (result?.ok) setUrl("");
    return result;
  }, null);

  return (
    <div className="rounded-2xl border border-line bg-card p-2 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.2)]">
      <form action={action} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            name="url"
            required
            autoFocus
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://un-link-muy-largo.com/…"
            className="input flex-1 border-transparent bg-transparent focus:border-line"
          />
          <button disabled={pending} className="btn-primary" aria-label="Cortar">
            <motion.span
              animate={pending ? { rotate: [0, -25, 0] } : { rotate: 0 }}
              transition={pending ? { repeat: Infinity, duration: 0.5 } : {}}
            >
              <Scissors />
            </motion.span>
            <span className="hidden sm:inline">Cortar</span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showSlug && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                name="slug"
                autoComplete="off"
                placeholder="alias-personalizado (opcional)"
                pattern="[a-zA-Z0-9_\-]{3,50}"
                className="input border-transparent bg-transparent font-mono text-sm focus:border-line"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <div className="flex items-center justify-between px-3 pt-1 pb-1">
        <button
          type="button"
          onClick={() => setShowSlug((v) => !v)}
          className="cursor-pointer text-xs text-muted transition hover:text-fg"
        >
          {showSlug ? "− Sin alias" : "+ Alias personalizado"}
        </button>
        <AnimatePresence>
          {state && !state.ok && (
            <motion.p
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-accent"
            >
              {state.error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {state?.ok && (
          <motion.div
            key={state.at}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-fg/[0.03] py-2 pr-2 pl-4">
              <div className="min-w-0 flex-1">
                <CutAnimation from={state.url} to={state.shortUrl} />
              </div>
              <CopyButton value={state.shortUrl} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
