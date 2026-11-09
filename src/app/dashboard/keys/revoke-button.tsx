"use client";

import { useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useT } from "@/components/preferences";
import { revokeKeyAction } from "../actions";

export function RevokeButton({ id, name }: { id: string; name: string }) {
  const t = useT();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: t.keys.confirmRevoke(name),
          text: t.keys.confirmRevokeText,
          confirmLabel: t.keys.revoke,
          danger: true,
        });
        if (ok) start(() => revokeKeyAction(id));
      }}
      className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
    >
      {pending ? t.keys.revoking : t.keys.revoke}
    </button>
  );
}
