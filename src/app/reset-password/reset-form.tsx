"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/preferences";
import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "../login/auth-form";

export function ResetForm({ token }: { token: string }) {
  const t = useT();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("confirm"))) return setError(t.recovery.mismatch);

    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) {
      return setError(error.code === "INVALID_TOKEN" ? t.recovery.invalidLink : translateAuthError(error, t.auth.errors));
    }
    setDone(true);
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <p className="mb-6 rounded-xl border border-line bg-card p-4 text-sm">{t.recovery.done}</p>
        <Link href="/login" className="btn-primary w-full">
          {t.recovery.goToLogin}
        </Link>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        name="password"
        type="password"
        required
        minLength={8}
        autoFocus
        placeholder={t.recovery.newPassword}
        autoComplete="new-password"
        className="input"
      />
      <input
        name="confirm"
        type="password"
        required
        minLength={8}
        placeholder={t.recovery.confirmPassword}
        autoComplete="new-password"
        className="input"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button disabled={pending} className="btn-primary mt-1">
        {pending ? t.recovery.saving : t.recovery.save}
      </button>
    </form>
  );
}
