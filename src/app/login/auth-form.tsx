"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GitHub, Google } from "@/components/icons";
import { UsernameField } from "@/components/username-field";
import { authClient } from "@/lib/auth-client";

export type Mode = "signin" | "signup";

export function AuthForm({
  next,
  providers,
  initialMode = "signin",
}: {
  next: string;
  providers: { github: boolean; google: boolean };
  initialMode?: Mode;
}) {
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

    if (error) return setError(translateError(error.code, error.message));
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
            <span className="relative">{m === "signin" ? "Entrar" : "Crear cuenta"}</span>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "signup" ? (
          <motion.div key="signup" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <UsernameField value={username} onChange={setUsername} />
            <input name="email" type="email" required placeholder="Email" autoComplete="email" className="input" />
          </motion.div>
        ) : (
          <motion.input
            key="signin"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            name="identifier"
            required
            placeholder="Email o usuario"
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
          placeholder="Contraseña"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="input"
        />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-accent"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button disabled={pending} className="btn-primary mt-1">
          {pending ? "Un momento…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      {(providers.github || providers.google) && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
          </div>
          <div className="flex flex-col gap-2">
            {providers.github && (
              <button type="button" onClick={() => social("github")} className="btn-ghost">
                <GitHub /> Continuar con GitHub
              </button>
            )}
            {providers.google && (
              <button type="button" onClick={() => social("google")} className="btn-ghost">
                <Google /> Continuar con Google
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

function translateError(code: string | undefined, fallback: string | undefined) {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_USERNAME_OR_PASSWORD":
      return "Usuario, email o contraseña incorrectos.";
    case "USERNAME_IS_ALREADY_TAKEN":
      return "Ese usuario ya está ocupado.";
    case "USERNAME_TOO_SHORT":
    case "USERNAME_TOO_LONG":
    case "INVALID_USERNAME":
      return "El usuario debe tener de 3 a 30 caracteres: letras, números, _ o punto.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Ya existe una cuenta con ese email.";
    case "PASSWORD_TOO_SHORT":
      return "La contraseña debe tener al menos 8 caracteres.";
    default:
      return fallback ?? "Algo salió mal. Intenta de nuevo.";
  }
}
