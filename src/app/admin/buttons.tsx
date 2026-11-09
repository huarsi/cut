"use client";

import { useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { blockDomainAction, grantUnlimitedAction } from "./actions";

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
