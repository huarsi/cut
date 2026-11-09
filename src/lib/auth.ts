import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getT } from "@/i18n/server";
import { keyFor, sendEmail, simpleEmail } from "@/lib/email";
import { baseUrl } from "@/lib/links";

const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } =
  process.env;

// Un proveedor social solo se activa si sus credenciales están configuradas.
export const enabledProviders = {
  github: Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
  google: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
};

export const auth = betterAuth({
  // Sin BETTER_AUTH_URL, en Vercel se usa el dominio de producción del proyecto.
  baseURL: baseUrl,
  // Permite iniciar sesión también desde las URLs de cada deploy y de cada rama (previews).
  trustedOrigins: [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // En producción, Better Auth limita los intentos (p. ej. de login). Se guardan en la base
  // para que el límite valga entre todas las instancias serverless.
  rateLimit: { storage: "database" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Al cambiar la contraseña con el link del correo se cierran las demás sesiones.
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url, token }) {
      const t = (await getT()).email.reset;
      await sendEmail({
        to: user.email,
        subject: t.subject,
        ...simpleEmail({ intro: t.intro, button: t.button, url, outro: t.outro }),
        idempotencyKey: keyFor("reset-password", token),
      });
    },
  },
  // Confirmar el correo no se pide al registrarse; solo hace falta para entrar a /admin.
  emailVerification: {
    expiresIn: 3600,
    async sendVerificationEmail({ user, url, token }) {
      const t = (await getT()).email.verify;
      await sendEmail({
        to: user.email,
        subject: t.subject,
        ...simpleEmail({ intro: t.intro, button: t.button, url, outro: t.outro }),
        idempotencyKey: keyFor("verify-email", token),
      });
    },
  },
  user: {
    // Borrar la cuenta también borra sus links y llaves (ON DELETE CASCADE).
    deleteUser: { enabled: true },
  },
  socialProviders: {
    ...(enabledProviders.github && {
      github: { clientId: GITHUB_CLIENT_ID!, clientSecret: GITHUB_CLIENT_SECRET! },
    }),
    ...(enabledProviders.google && {
      google: { clientId: GOOGLE_CLIENT_ID!, clientSecret: GOOGLE_CLIENT_SECRET! },
    }),
  },
  // Usuarios de 3 a 30 caracteres: letras, números, _ y punto. Se guardan en minúsculas.
  plugins: [username(), nextCookies()],
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/** Devuelve el usuario en sesión o manda a login, regresando después a `next`. */
export async function requireUser(next = "/dashboard") {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session.user;
}

/** Si el usuario tiene contraseña (y no solo login con GitHub o Google). */
export async function hasPassword(userId: string) {
  const [found] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "credential")))
    .limit(1);
  return Boolean(found);
}
