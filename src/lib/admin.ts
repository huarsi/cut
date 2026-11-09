import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";

// Correos de quienes moderan, separados por comas: ADMIN_EMAILS=tu@correo.com,otra@correo.com
// Reciben el aviso de cada reporte nuevo y pueden entrar a /admin, después de confirmar su correo.
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Si el correo está en la lista. Sirve para mostrar "Moderación" en el menú; no da acceso por sí solo. */
export const isAdmin = (email: string | null | undefined) =>
  Boolean(email) && ADMIN_EMAILS.includes(email!.toLowerCase());

/**
 * Puede moderar quien tiene un correo de la lista y además lo confirmó. Sin confirmar, cualquiera
 * que registrara primero un correo de la lista (o uno que quedó libre) entraría al portal.
 */
export const canModerate = (user: { email: string; emailVerified: boolean }) =>
  isAdmin(user.email) && user.emailVerified;

/**
 * Sesión de alguien de la lista, confirmado o no (la página de /admin le pide confirmar).
 * A cualquier otra persona le responde 404, como si /admin no existiera.
 */
export async function requireListedAdmin() {
  const session = await getSession();
  if (!session || !isAdmin(session.user.email)) notFound();
  return session.user;
}

/** Devuelve a quien modera, con correo confirmado. Lo usa cada acción del portal. */
export async function requireAdmin() {
  const user = await requireListedAdmin();
  if (!canModerate(user)) notFound();
  return user;
}
