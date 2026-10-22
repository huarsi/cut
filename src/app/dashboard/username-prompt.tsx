"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/preferences";
import { USERNAME_PATTERN, UsernameField } from "@/components/username-field";
import { authClient } from "@/lib/auth-client";

/** Para cuentas creadas antes de que existieran los usuarios. */
export function UsernamePrompt() {
  const t = useT();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const { error } = await authClient.updateUser({ username, displayUsername: username });
    setPending(false);
    if (error) return setError(error.message ?? t.username.saveError);
    router.refresh();
  }

  return (
    <motion.form
      onSubmit={save}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border border-line bg-card p-4"
    >
      <p className="text-sm">{t.username.prompt}</p>
      <div className="mt-3 flex items-start gap-2">
        <UsernameField value={username} onChange={setUsername} className="flex-1" />
        <button disabled={pending || !USERNAME_PATTERN.test(username)} className="btn-primary">
          {pending ? t.username.saving : t.username.save}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </motion.form>
  );
}
