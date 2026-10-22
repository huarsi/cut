"use client";

import { useTransition } from "react";
import { useT } from "@/components/preferences";
import { revokeKeyAction } from "../actions";

export function RevokeButton({ id, name }: { id: string; name: string }) {
  const t = useT();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(t.keys.confirmRevoke(name))) {
          start(() => revokeKeyAction(id));
        }
      }}
      className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
    >
      {pending ? t.keys.revoking : t.keys.revoke}
    </button>
  );
}
