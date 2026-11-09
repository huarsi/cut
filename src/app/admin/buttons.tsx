"use client";

import { useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import {
  blockDomainAction,
  disableLinkAction,
  dismissReportsAction,
  grantUnlimitedAction,
  replyToReportAction,
} from "./actions";

/** Botón que corre una server action, con confirmación opcional. El portal está en español. */
export function ActionButton({
  action,
  confirm: confirmWith,
  danger = false,
  children,
}: {
  action: () => Promise<void>;
  confirm?: { title: string; text?: string; label: string; danger?: boolean };
  danger?: boolean;
  children: React.ReactNode;
}) {
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok =
          !confirmWith ||
          (await confirm({
            title: confirmWith.title,
            text: confirmWith.text,
            confirmLabel: confirmWith.label,
            cancelLabel: "Cancelar",
            danger: confirmWith.danger,
          }));
        if (ok) start(action);
      }}
      className={`btn h-9 px-3.5 text-sm ${
        danger ? "bg-danger text-white hover:bg-danger/85" : "border border-line bg-card hover:border-fg/30"
      }`}
    >
      {pending ? "…" : children}
    </button>
  );
}

/** Bloquear un dominio a mano, sin reporte de por medio. */
export function BlockDomainForm() {
  const confirm = useConfirm();
  const [domain, setDomain] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const value = domain.trim();
        if (!value.includes(".")) return;
        const ok = await confirm({
          title: `¿Bloquear ${value}?`,
          text: "También sus subdominios. Se desactivan todos sus links y no se podrán crear nuevos.",
          confirmLabel: "Bloquear",
          cancelLabel: "Cancelar",
          danger: true,
        });
        if (!ok) return;
        start(async () => {
          await blockDomainAction(value);
          setDomain("");
        });
      }}
      className="flex gap-2"
    >
      <input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="dominio-malo.com"
        autoComplete="off"
        spellCheck={false}
        className="input h-10 flex-1 font-mono text-sm"
      />
      <button disabled={pending} className="btn-primary h-10 px-4 text-sm">
        {pending ? "Bloqueando…" : "Bloquear"}
      </button>
    </form>
  );
}

/** Dar cuenta ilimitada a cualquier usuario, sin que la haya pedido. */
export function GrantUnlimitedForm() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await grantUnlimitedAction(query);
            setResult(res);
            if (res.ok) setQuery("");
          });
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResult(null);
          }}
          required
          placeholder="correo@ejemplo.com o @usuario"
          autoComplete="off"
          spellCheck={false}
          className="input h-10 flex-1 text-sm"
        />
        <button disabled={pending} className="btn-primary h-10 px-4 text-sm">
          {pending ? "Dando…" : "Dar ilimitado"}
        </button>
      </form>
      {result && <p className={`mt-2 text-sm ${result.ok ? "text-muted" : "text-danger"}`}>{result.text}</p>}
    </div>
  );
}

/**
 * Acciones de un grupo de reportes. La casilla decide si al resolver se avisa por correo,
 * automáticamente, a quien reportó y dejó su correo (sin contar a quien ya se le respondió a mano).
 */
export function ReportActions({
  groupKey,
  linkId,
  host,
  linkDisabled,
  toNotify,
}: {
  groupKey: string;
  linkId: string | null;
  host: string | null;
  linkDisabled: boolean;
  toNotify: number;
}) {
  const [notify, setNotify] = useState(true);
  const send = notify && toNotify > 0;

  return (
    <div className="mt-4">
      {toNotify > 0 && (
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="size-4 accent-[var(--color-fg)]"
          />
          Avisar del resultado por correo a {toNotify === 1 ? "quien reportó" : `las ${toNotify} personas que reportaron`}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {linkId && !linkDisabled && (
          <ActionButton action={() => disableLinkAction(linkId, send)} danger>
            Desactivar link
          </ActionButton>
        )}
        {linkId && host && (
          <ActionButton
            action={() => blockDomainAction(host, linkId, send)}
            confirm={{
              title: `¿Bloquear ${host}?`,
              text: "También sus subdominios. Se desactivan todos sus links y no se podrán crear nuevos.",
              label: "Bloquear",
              danger: true,
            }}
          >
            {linkDisabled ? `Bloquear ${host}` : `Desactivar y bloquear ${host}`}
          </ActionButton>
        )}
        {linkId && linkDisabled ? (
          <ActionButton action={() => disableLinkAction(linkId, send)}>Cerrar reportes</ActionButton>
        ) : (
          <ActionButton action={() => dismissReportsAction(groupKey, send)}>Descartar</ActionButton>
        )}
      </div>
    </div>
  );
}

/** Responder a mano a quien reportó. Si contesta el correo, le llega a quien moderó. */
export function ReplyToReporter({ reportId, email, adminEmail }: { reportId: string; email: string; adminEmail: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  // Al enviar, la página se actualiza y muestra "respondido a mano" con el texto enviado.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setResult(null);
        }}
        className="font-medium text-fg underline-offset-2 hover:underline"
      >
        Responder
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await replyToReportAction(reportId, message);
          setResult(res);
          if (res.ok) {
            setMessage("");
            setOpen(false);
          }
        });
      }}
      className="mt-2 w-full basis-full"
    >
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        autoFocus
        rows={4}
        maxLength={2000}
        placeholder="Gracias por avisarnos. Revisamos el link y…"
        className="input min-h-24 w-full resize-y py-2 text-sm"
      />
      <p className="mt-1.5 text-xs text-muted">
        Se manda a {email}. Si contesta, le llega a {adminEmail}.
      </p>
      {result && !result.ok && <p className="mt-1.5 text-sm text-danger">{result.text}</p>}
      <div className="mt-2 flex gap-2">
        <button disabled={pending} className="btn-primary h-9 px-3.5 text-sm">
          {pending ? "Enviando…" : "Enviar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost h-9 px-3.5 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
