"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import type { CreateLinkState } from "@/lib/links";
import { ALIAS_MAX, SLUG_LENGTH } from "@/lib/slug";
import { CopyButton } from "./copy-button";
import { CutAnimation } from "./cut-animation";
import { Scissors } from "./icons";
import { LengthPicker } from "./length-picker";
import { useT } from "./preferences";

type Props = {
  action: (prev: CreateLinkState, form: FormData) => Promise<CreateLinkState>;
  /** Dominio de los links cortos, para la vista previa del largo. */
  host: string;
  /** El alias personalizado es solo para usuarios con cuenta. */
  allowSlug?: boolean;
  defaultUrl?: string;
  autoFocus?: boolean;
};

export function CreateLinkForm({ action: createLink, host, allowSlug = false, defaultUrl = "", autoFocus = false }: Props) {
  const t = useT();
  // URL y alias son controlados para conservar lo escrito si hay error y limpiarlos solo al tener éxito.
  const [url, setUrl] = useState(defaultUrl);
  const [slug, setSlug] = useState("");
  const [length, setLength] = useState<number>(SLUG_LENGTH.default);
  const [showSlug, setShowSlug] = useState(false);
  const [state, action, pending] = useActionState<CreateLinkState, FormData>(async (prev, form) => {
    const result = await createLink(prev, form);
    if (result?.ok) {
      setUrl("");
      setSlug("");
    }
    return result;
  }, null);

  const usingAlias = allowSlug && showSlug && slug.trim() !== "";

  return (
    <div className="rounded-2xl border border-line bg-card p-2 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.2)]">
      <form action={action} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            name="url"
            required
            autoFocus={autoFocus}
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t.form.urlPlaceholder}
            className="input flex-1 border-transparent bg-transparent focus:border-line"
          />
          <button disabled={pending} className="btn-primary" aria-label={t.form.cut}>
            <motion.span
              animate={pending ? { rotate: [0, -25, 0] } : { rotate: 0 }}
              transition={pending ? { repeat: Infinity, duration: 0.5 } : {}}
            >
              <Scissors />
            </motion.span>
            <span className="hidden sm:inline">{t.form.cut}</span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {allowSlug && showSlug && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                name="slug"
                autoComplete="off"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={t.form.aliasPlaceholder}
                maxLength={ALIAS_MAX}
                pattern={`[a-zA-Z0-9_\\-]{3,${ALIAS_MAX}}`}
                className="input border-transparent bg-transparent font-mono text-sm focus:border-line"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 pb-1">
          <LengthPicker value={length} onChange={setLength} host={host} disabled={usingAlias} />
          {allowSlug && (
            <button
              type="button"
              onClick={() => setShowSlug((v) => !v)}
              className="cursor-pointer text-xs text-muted transition hover:text-fg"
            >
              {showSlug ? t.form.removeAlias : t.form.addAlias}
            </button>
          )}
        </div>
      </form>

      <AnimatePresence initial={false}>
        {state && !state.ok && (
          <motion.p
            key={state.error}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-3 pb-1.5 text-xs text-danger"
          >
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>

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
