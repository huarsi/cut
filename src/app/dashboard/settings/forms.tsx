"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { useT } from "@/components/preferences";
import { USERNAME_PATTERN, UsernameField } from "@/components/username-field";
import { authClient } from "@/lib/auth-client";
import { translateAuthError } from "../../login/auth-form";

type Feedback = { ok: boolean; text: string } | null;

function Message({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return <p className={`mt-2 text-sm ${feedback.ok ? "text-muted" : "text-danger"}`}>{feedback.text}</p>;
}

export function UsernameForm({ current }: { current: string | null }) {
  const t = useT();
  const router = useRouter();
  const [username, setUsername] = useState(current ?? "");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const unchanged = username.toLowerCase() === (current ?? "").toLowerCase();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const { error } = await authClient.updateUser({ username, displayUsername: username });
    setPending(false);
    if (error) return setFeedback({ ok: false, text: translateAuthError(error, t.auth.errors) });
    setFeedback({ ok: true, text: t.settings.saved });
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <div className="flex items-start gap-2">
        <UsernameField
          value={username}
          current={current}
          onChange={(value) => {
            setUsername(value);
            setFeedback(null);
          }}
          className="flex-1"
        />
        <button disabled={pending || unchanged || !USERNAME_PATTERN.test(username)} className="btn-primary">
          {pending ? t.settings.saving : t.settings.save}
        </button>
      </div>
      <Message feedback={feedback} />
    </form>
  );
}

export function PasswordForm({ hasPassword, canResetPassword }: { hasPassword: boolean; canResetPassword: boolean }) {
  const t = useT();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);

  // Quien entra solo con GitHub o Google no tiene contraseña actual; puede crear una con el correo.
  if (!hasPassword) {
    return (
      <p className="text-sm text-muted">
        {t.settings.noPassword}{" "}
        {canResetPassword ? (
          <Link
            href="/forgot-password"
            className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg"
          >
            {t.settings.noPasswordLink}
          </Link>
        ) : (
          t.settings.noPasswordLink
        )}
        .
      </p>
    );
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setFeedback(null);
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get("current")),
      newPassword: String(form.get("new")),
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) return setFeedback({ ok: false, text: translateAuthError(error, t.auth.errors) });
    formElement.reset();
    setFeedback({ ok: true, text: t.settings.passwordChanged });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <input
        name="current"
        type="password"
        required
        placeholder={t.settings.currentPassword}
        autoComplete="current-password"
        className="input"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="new"
          type="password"
          required
          minLength={8}
          placeholder={t.settings.newPassword}
          autoComplete="new-password"
          className="input flex-1"
        />
        <button disabled={pending} className="btn-primary">
          {pending ? t.settings.saving : t.settings.changePassword}
        </button>
      </div>
      <Message feedback={feedback} />
    </form>
  );
}

export function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const t = useT();
  const confirm = useConfirm();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Se lee antes de abrir el diálogo: después del await, el evento ya no tiene el formulario.
    const password = hasPassword ? String(new FormData(event.currentTarget).get("password")) : undefined;
    const ok = await confirm({
      title: t.settings.confirmDelete,
      text: t.settings.confirmDeleteText,
      confirmLabel: t.settings.deleteButton,
      danger: true,
    });
    if (!ok) return;
    setPending(true);
    setError(null);
    // Sin contraseña (cuentas de GitHub o Google), Better Auth pide que la sesión sea reciente.
    const { error } = await authClient.deleteUser(password ? { password } : {});
    if (error) {
      setPending(false);
      return setError(translateAuthError(error, t.auth.errors));
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={remove}>
      <div className="flex flex-col gap-2 sm:flex-row">
        {hasPassword && (
          <input
            name="password"
            type="password"
            required
            placeholder={t.settings.deletePassword}
            autoComplete="current-password"
            className="input flex-1"
          />
        )}
        <button
          disabled={pending}
          className="btn border border-danger/40 text-danger hover:bg-danger hover:text-white"
        >
          {pending ? t.settings.deleting : t.settings.deleteButton}
        </button>
      </div>
      <Message feedback={error ? { ok: false, text: error } : null} />
    </form>
  );
}
