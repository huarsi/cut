"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/preferences";
import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "../login/auth-form";

export function ForgotForm() {
  const t = useT();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setPending(true);
    setError(null);
    // Responde igual exista o no la cuenta, para no revelar qué correos están registrados.
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (error) return setError(translateAuthError(error, t.auth.errors));
    setSentTo(email);
  }

  return (
    <>
      {sentTo ? (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-line bg-card p-4 text-sm"
        >
          {t.recovery.sent(sentTo)}
        </motion.p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input name="email" type="email" required autoFocus placeholder={t.auth.email} autoComplete="email" className="input" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button disabled={pending} className="btn-primary mt-1">
            {pending ? t.recovery.sending : t.recovery.send}
          </button>
        </form>
      )}
      <p className="mt-6 text-center">
        <Link href="/login" className="text-sm text-muted transition hover:text-fg">
          {t.recovery.backToLogin}
        </Link>
      </p>
    </>
  );
}
