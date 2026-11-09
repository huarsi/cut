"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { CopyButton } from "@/components/copy-button";
import { External, Pencil, Trash } from "@/components/icons";
import { deleteLinkAction, updateLinkAction } from "@/app/dashboard/actions";
import { displayUrl, timeAgo } from "@/lib/format";
import { URL_MAX } from "@/lib/limits";
import { useConfirm } from "./confirm-dialog";
import { usePreferences, useT } from "./preferences";

type Props = {
  slug: string;
  url: string;
  shortUrl: string;
  clicks: number;
  createdAt: string;
  lastClickedAt: string | null;
  /** Desactivado por moderación: ya no redirige. */
  disabled?: boolean;
  /** Los links anónimos no se pueden editar ni borrar: no hay cuenta que pruebe quién es el dueño. */
  manageable?: boolean;
};

export function LinkRow({
  slug,
  url,
  shortUrl,
  clicks,
  createdAt,
  lastClickedAt,
  disabled = false,
  manageable = true,
}: Props) {
  const t = useT();
  const confirm = useConfirm();
  const { locale } = usePreferences();
  const [deleting, startDelete] = useTransition();
  const [saving, startSave] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(url);
    setError(null);
    setEditing(true);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (draft.trim() === url) return setEditing(false);
    startSave(async () => {
      const result = await updateLinkAction(slug, draft);
      if (result.ok) setEditing(false);
      else setError(result.error);
    });
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: deleting ? 0.4 : 1, y: 0 }}
      className="group px-4 py-3.5 sm:px-5"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={shortUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 font-mono text-[15px] font-medium hover:text-accent"
          >
            <span className={`truncate ${disabled ? "text-muted line-through" : ""}`}>{displayUrl(shortUrl)}</span>
            <External width={13} height={13} className="shrink-0 opacity-0 transition group-hover:opacity-60" />
          </a>
          {disabled && (
            <span
              title={t.link.disabledHint}
              className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 align-middle text-[11px] font-medium text-danger"
            >
              {t.link.disabled}
            </span>
          )}
          {!editing && (
            <p className="truncate text-sm text-muted" title={url}>
              {displayUrl(url)}
            </p>
          )}
        </div>

        <div className="hidden text-right text-sm sm:block">
          <p className="font-medium tabular-nums" title={t.link.realClicksHint}>
            {clicks} <span className="font-normal text-muted">{t.link.clicks(clicks)}</span>
          </p>
          {/* La hora relativa puede diferir unos segundos entre servidor y navegador. */}
          <p className="text-xs text-muted" suppressHydrationWarning>
            {lastClickedAt ? t.link.lastClick(timeAgo(lastClickedAt, locale)) : timeAgo(createdAt, locale)}
          </p>
        </div>

        <div className="flex items-center">
          <CopyButton value={shortUrl} />
          {manageable && (
            <>
              <button
                type="button"
                aria-label={t.link.edit}
                aria-pressed={editing}
                onClick={() => (editing ? setEditing(false) : startEditing())}
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-fg/5 hover:text-fg aria-pressed:text-fg"
              >
                <Pencil width={15} height={15} />
              </button>
              <button
                type="button"
                aria-label={t.link.delete}
                disabled={deleting}
                onClick={async () => {
                  const ok = await confirm({
                    title: t.link.confirmDelete(slug),
                    text: t.link.confirmDeleteText,
                    confirmLabel: t.link.delete,
                    danger: true,
                  });
                  if (ok) startDelete(() => deleteLinkAction(slug));
                }}
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
              >
                <Trash width={16} height={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* En móvil los clics van abajo, porque la columna de la derecha se oculta. */}
      <p className="mt-0.5 text-xs text-muted tabular-nums sm:hidden">
        {clicks} {t.link.clicks(clicks)}
      </p>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.form
            onSubmit={save}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pt-2 pb-1.5 text-xs text-muted">{t.link.editHint}</p>
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                required
                autoFocus
                autoComplete="off"
                maxLength={URL_MAX}
                aria-label={t.link.newUrl}
                aria-invalid={Boolean(error)}
                className="input h-10 flex-1 text-sm"
              />
              <button disabled={saving} className="btn-primary h-10 px-4 text-sm">
                {saving ? t.link.saving : t.link.save}
              </button>
            </div>
            {error && <p className="pt-1.5 text-xs text-danger">{error}</p>}
          </motion.form>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
