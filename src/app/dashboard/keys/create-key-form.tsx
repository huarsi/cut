"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { useT } from "@/components/preferences";
import { createKeyAction } from "../actions";

export function CreateKeyForm() {
  const t = useT();
  const [key, action, pending] = useActionState(createKeyAction, null);

  return (
    <div className="rounded-2xl border border-line bg-card p-2">
      <form action={action} className="flex gap-2">
        <input
          name="name"
          required
          maxLength={60}
          autoComplete="off"
          placeholder={t.keys.namePlaceholder}
          className="input flex-1 border-transparent bg-transparent focus:border-line"
        />
        <button disabled={pending} className="btn-primary">
          {pending ? t.keys.creating : t.keys.create}
        </button>
      </form>

      <AnimatePresence>
        {key && (
          <motion.div
            key={key}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl bg-accent/[0.07] p-4">
              <p className="text-sm font-medium">{t.keys.copyNow}</p>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-card py-1 pr-1 pl-3">
                <code className="min-w-0 flex-1 truncate font-mono text-sm">{key}</code>
                <CopyButton value={key} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
