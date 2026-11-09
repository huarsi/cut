import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";

// Correos de quienes moderan, separados por comas: ADMIN_EMAILS=tu@correo.com,otra@correo.com
// Reciben el aviso de cada reporte nuevo y pueden entrar a /admin.
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdmin = (email: string | null | undefined) =>
  Boolean(email) && ADMIN_EMAILS.includes(email!.toLowerCase());

/** Devuelve al administrador en sesión. A cualquier otra persona le responde 404, como si /admin no existiera. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session || !isAdmin(session.user.email)) notFound();
  return session.user;
}
