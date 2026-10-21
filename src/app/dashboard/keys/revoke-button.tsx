"use client";

import { useTransition } from "react";
import { revokeKeyAction } from "../actions";

export function RevokeButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`¿Revocar “${name}”? Los scripts que la usen dejarán de funcionar.`)) {
          start(() => revokeKeyAction(id));
        }
      }}
      className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-accent/10 hover:text-accent disabled:opacity-50"
    >
      {pending ? "Revocando…" : "Revocar"}
    </button>
  );
}
