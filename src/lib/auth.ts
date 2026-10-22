import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
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
  // Permite iniciar sesión también desde la URL propia de cada deploy (previews).
  trustedOrigins: process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
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
