"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { blockDomain, disableLink, dismissReports, enableLink, replyToReporter, unblockDomain } from "@/lib/reports";
import { findUser, resolveRequest, setUnlimited } from "@/lib/support";

// Cada acción vuelve a comprobar que quien la llama es administrador.
// `notify`: si se avisa por correo a quien reportó (si dejó su correo y no se le respondió a mano).

export async function disableLinkAction(linkId: string, notify = true) {
  const admin = await requireAdmin();
  await disableLink(linkId, admin.email, notify);
  revalidatePath("/admin");
}

export async function blockDomainAction(domain: string, linkId?: string, notify = true) {
  const admin = await requireAdmin();
  // El link reportado se desactiva aunque su host no coincida exacto (p. ej. si cambió de destino).
  if (linkId) await disableLink(linkId, admin.email, notify);
  await blockDomain(domain, admin.email, linkId ? "Desde un reporte" : "Agregado a mano", notify);
  revalidatePath("/admin");
}

export async function dismissReportsAction(key: string, notify = true) {
  const admin = await requireAdmin();
  await dismissReports(key, admin.email, notify);
  revalidatePath("/admin");
}

/** Respuesta escrita a mano a quien reportó. Devuelve un mensaje para mostrar. */
export async function replyToReportAction(reportId: string, message: string) {
  const admin = await requireAdmin();
  const result = await replyToReporter(reportId, message, admin.email);
  if (result.ok) revalidatePath("/admin");
  return result;
}

export async function enableLinkAction(linkId: string) {
  await requireAdmin();
  await enableLink(linkId);
  revalidatePath("/admin");
}

export async function unblockDomainAction(domain: string) {
  await requireAdmin();
  await unblockDomain(domain);
  revalidatePath("/admin");
}

export async function resolveRequestAction(ticketId: string, approve: boolean) {
  const admin = await requireAdmin();
  await resolveRequest(ticketId, approve, admin.email);
  revalidatePath("/admin");
}

export async function revokeUnlimitedAction(userId: string) {
  const admin = await requireAdmin();
  await setUnlimited(userId, false, admin.email);
  revalidatePath("/admin");
}

/** Da cuenta ilimitada buscando por correo o usuario. Devuelve un mensaje para mostrar. */
export async function grantUnlimitedAction(query: string) {
  const admin = await requireAdmin();
  const found = await findUser(query);
  if (!found) return { ok: false, text: "No hay ninguna cuenta con ese correo o usuario." };
  const name = found.username ? `@${found.username}` : found.email;
  if (found.unlimited) return { ok: true, text: `${name} ya era ilimitada.` };
  await setUnlimited(found.id, true, admin.email);
  revalidatePath("/admin");
  return { ok: true, text: `${name} ahora es ilimitada.` };
}
