"use client";

import { motion } from "motion/react";
import { useTransition } from "react";
import { CopyButton } from "@/components/copy-button";
import { External, Trash } from "@/components/icons";
import { displayUrl, timeAgo } from "@/lib/format";
import { deleteLinkAction } from "@/app/dashboard/actions";
import { usePreferences, useT } from "./preferences";

type Props = {
  slug: string;
  url: string;
  shortUrl: string;
  clicks: number;
  createdAt: string;
  /** Los links anónimos no se pueden borrar: no hay cuenta que pruebe quién es el dueño. */
  deletable?: boolean;
};

export function LinkRow({ slug, url, shortUrl, clicks, createdAt, deletable = true }: Props) {
  const t = useT();
  const { locale } = usePreferences();
  const [deleting, startDelete] = useTransition();

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: deleting ? 0.4 : 1, y: 0 }}
      className="group flex items-center gap-3 px-4 py-3.5 sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <a
          href={shortUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 font-mono text-[15px] font-medium hover:text-accent"
        >
          <span className="truncate">{displayUrl(shortUrl)}</span>
          <External width={13} height={13} className="shrink-0 opacity-0 transition group-hover:opacity-60" />
        </a>
        <p className="truncate text-sm text-muted" title={url}>
          {displayUrl(url)}
        </p>
      </div>

      <div className="hidden text-right text-sm sm:block">
        <p className="font-medium tabular-nums">
          {clicks} <span className="font-normal text-muted">{t.link.clicks(clicks)}</span>
        </p>
        {/* La hora relativa puede diferir unos segundos entre servidor y navegador. */}
        <p className="text-xs text-muted" suppressHydrationWarning>
          {timeAgo(createdAt, locale)}
        </p>
      </div>

      <div className="flex items-center">
        <CopyButton value={shortUrl} />
        {deletable && (
          <button
            type="button"
            aria-label={t.link.delete}
            disabled={deleting}
            onClick={() => {
              if (confirm(t.link.confirmDelete(slug))) startDelete(() => deleteLinkAction(slug));
            }}
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
          >
            <Trash width={16} height={16} />
          </button>
        )}
      </div>
    </motion.li>
  );
}
