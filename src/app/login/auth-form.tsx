"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GitHub, Google } from "@/components/icons";
import { useT } from "@/components/preferences";
import { UsernameField } from "@/components/username-field";
import type { Dictionary } from "@/i18n/dictionaries";
import { authClient } from "@/lib/auth-client";

export type Mode = "signin" | "signup";

export function AuthForm({
  next,
  providers,
  canResetPassword,
  initialMode = "signin",
}: {
  next: string;
  providers: { github: boolean; google: boolean };
  /** Solo si hay cómo mandar el correo de recuperación. */
  canResetPassword: boolean;
  initialMode?: Mode;
}) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));

    setPending(true);
    setError(null);
    const { error } = await (mode === "signup"
      ? authClient.signUp.email({ email: String(form.get("email")), password, name: username, username })
      : signIn(String(form.get("identifier")).trim(), password));
    setPending(false);

    if (error) return setError(translateAuthError(error, t.auth.errors));
    router.push(next);
    router.refresh();
  }

  const social = (provider: "github" | "google") =>
    authClient.signIn.social({ provider, callbackURL: next });

  return (
    <div>
      <div className="relative mb-8 grid grid-cols-2 rounded-xl border border-line bg-card p-1 text-sm">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`relative h-9 cursor-pointer rounded-lg font-medium transition-colors ${
              mode === m ? "text-bg" : "text-muted hover:text-fg"
            }`}
          >
            {mode === m && (
              <motion.span
                layoutId="auth-tab"
                className="absolute inset-0 rounded-lg bg-fg"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{m === "signin" ? t.auth.signIn : t.auth.signUp}</span>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "signup" ? (
          <motion.div key="signup" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <UsernameField value={username} onChange={setUsername} />
            <input name="email" type="email" required placeholder={t.auth.email} autoComplete="email" className="input" />
          </motion.div>
        ) : (
          <motion.input
            key="signin"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            name="identifier"
            required
            placeholder={t.auth.identifier}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="input"
          />
        )}
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder={t.auth.password}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="input"
        />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-danger"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button disabled={pending} className="btn-primary mt-1">
          {pending ? t.auth.wait : mode === "signin" ? t.auth.signIn : t.auth.signUp}
        </button>
      </form>

      {mode === "signin" && canResetPassword && (
        <p className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-muted transition hover:text-fg">
            {t.auth.forgot}
          </Link>
        </p>
      )}

      {(providers.github || providers.google) && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            {t.auth.or}
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="flex flex-col gap-2">
            {providers.github && (
              <button type="button" onClick={() => social("github")} className="btn-ghost">
                <GitHub /> {t.auth.github}
              </button>
            )}
            {providers.google && (
              <button type="button" onClick={() => social("google")} className="btn-ghost">
                <Google /> {t.auth.google}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Con "@" se trata como correo; si no, como nombre de usuario. */
function signIn(identifier: string, password: string) {
  return identifier.includes("@")
    ? authClient.signIn.email({ email: identifier, password })
    : authClient.signIn.username({ username: identifier, password });
}

/** Traduce los errores de Better Auth. También lo usan recuperar contraseña y la página de cuenta. */
export function translateAuthError(
  error: { code?: string; status?: number },
  errors: Dictionary["auth"]["errors"],
) {
  if (error.status === 429) return errors.rateLimited;
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_USERNAME_OR_PASSWORD":
      return errors.invalidCredentials;
    case "USERNAME_IS_ALREADY_TAKEN":
      return errors.usernameTaken;
    case "USERNAME_TOO_SHORT":
    case "USERNAME_TOO_LONG":
    case "INVALID_USERNAME":
      return errors.usernameInvalid;
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return errors.userExists;
    case "PASSWORD_TOO_SHORT":
      return errors.passwordShort;
    case "INVALID_PASSWORD":
      return errors.wrongPassword;
    case "SESSION_EXPIRED":
    case "SESSION_NOT_FRESH":
      return errors.sessionExpired;
    default:
      return errors.generic;
  }
}
