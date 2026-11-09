"use client";

import { motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useT } from "./preferences";

export type ConfirmOptions = {
  title: string;
  text?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Acción destructiva: botón rojo y el foco empieza en "Cancelar". */
  danger?: boolean;
};

type Request = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Devuelve `confirm(opciones)`, que abre el diálogo y resuelve true si la persona confirma. */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  return confirm;
}

/**
 * Diálogo de confirmación con el diseño de cut., en lugar del `confirm()` del navegador.
 * Usa `<dialog>` con `showModal()`: el navegador atrapa el foco, inactiva el fondo y cierra con Escape.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({ ...options, resolve });
      }),
    [],
  );

  const close = useCallback(
    (ok: boolean) => {
      request?.resolve(ok);
      setRequest(null);
    },
    [request],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <Dialog request={request} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

function Dialog({ request, onClose }: { request: Request; onClose: (ok: boolean) => void }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby={request.text ? "confirm-text" : undefined}
      // Escape dispara "cancel".
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      // Clic en el fondo oscuro (fuera de la tarjeta) también cancela.
      onClick={(e) => e.target === e.currentTarget && onClose(false)}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] overflow-visible bg-transparent p-0 text-fg backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
    >
      <motion.div
        role="alertdialog"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
        className="rounded-2xl border border-line bg-card p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
      >
        <h2 id="confirm-title" className="text-lg font-semibold tracking-tight text-balance">
          {request.title}
        </h2>
        {request.text && (
          <p id="confirm-text" className="mt-2 text-sm text-muted">
            {request.text}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" autoFocus={request.danger} onClick={() => onClose(false)} className="btn-ghost h-10 text-sm">
            {request.cancelLabel ?? t.dialog.cancel}
          </button>
          <button
            type="button"
            autoFocus={!request.danger}
            onClick={() => onClose(true)}
            className={`btn h-10 text-sm ${request.danger ? "bg-danger text-white hover:bg-danger/85" : "bg-fg text-bg hover:bg-fg/85"}`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </motion.div>
    </dialog>
  );
}
