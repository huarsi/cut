"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className="cursor-pointer rounded-lg px-3 py-2 text-muted transition hover:text-fg"
    >
      Salir
    </button>
  );
}
