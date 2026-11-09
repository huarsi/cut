"use client";

import { motion } from "motion/react";
import { useActionState, useState } from "react";
import { useT } from "@/components/preferences";
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from "@/lib/limits";
import { reportAction, type ReportState } from "./actions";

export function ReportForm({ defaultLink }: { defaultLink: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(reportAction, null);
  // Campos controlados: React vacía los no controlados al terminar la acción, aunque haya error.
  const [link, setLink] = useState(defaultLink);
  const [reason, setReason] = useState<ReportReason>("phishing");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  // Al pulsar "reportar otro" se oculta el resultado anterior.
  const [dismissed, setDismissed] = useState<ReportState>(null);
  const current = state === dismissed ? null : state;

  function reportAnother() {
    setDismissed(state);
    setLink("");
    setDetails("");
  }

  if (current?.ok) {
    return (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <p className="rounded-2xl border border-line bg-card p-5">{t.report.sent}</p>
        <button
          type="button"
          onClick={reportAnother}
          className="mt-4 cursor-pointer text-sm text-muted transition hover:text-fg"
        >
          {t.report.another}
        </button>
      </motion.div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t.report.link}</span>
        <input
          name="link"
          required
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder={t.report.linkPlaceholder}
          autoComplete="off"
          spellCheck={false}
          className="input font-mono text-sm"
        />
      </label>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t.report.reason}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                reason === r ? "border-fg/40 bg-card" : "border-line hover:border-fg/20"
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-[var(--fg)]"
              />
              {t.report.reasons[r]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t.report.details}</span>
        <textarea
          name="details"
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={REPORT_DETAILS_MAX}
          placeholder={t.report.detailsPlaceholder}
          className="input h-auto py-3"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t.report.email}</span>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          autoComplete="email"
          className="input"
        />
      </label>

      {/* Trampa para bots: invisible para personas y lectores de pantalla. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] size-px opacity-0"
      />

      {current && !current.ok && <p className="text-sm text-danger">{current.error}</p>}

      <button disabled={pending} className="btn-primary self-start">
        {pending ? t.report.sending : t.report.send}
      </button>
    </form>
  );
}
