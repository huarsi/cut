import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { after } from "next/server";
import { db } from "@/db";
import { link, supportTicket, user } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/server";
import { ADMIN_EMAILS } from "@/lib/admin";
import { sendEmail, simpleEmail } from "@/lib/email";
import { baseUrl } from "@/lib/links";

const MESSAGE_MAX = 1000;

export type UnlimitedStatus = "unlimited" | "pending" | "none";

export async function unlimitedStatus(userId: string): Promise<UnlimitedStatus> {
  const [[account], [pending]] = await Promise.all([
    db.select({ unlimited: user.unlimited }).from(user).where(eq(user.id, userId)),
    db
      .select({ id: supportTicket.id })
      .from(supportTicket)
      .where(and(eq(supportTicket.userId, userId), eq(supportTicket.status, "open")))
      .limit(1),
  ]);
  if (account?.unlimited) return "unlimited";
  return pending ? "pending" : "none";
}

/** Crea la solicitud de cuenta ilimitada y avisa a quien modera. Una sola pendiente por usuario. */
export async function requestUnlimited(userId: string, message: string) {
  const status = await unlimitedStatus(userId);
  if (status !== "none") return status;

  const id = nanoid();
  await db.insert(supportTicket).values({
    id,
    userId,
    message: message.trim().slice(0, MESSAGE_MAX) || null,
    locale: await getLocale(),
  });

  if (ADMIN_EMAILS.length > 0) {
    after(() => notifyAdmins(id).catch((error) => console.error("No se pudo avisar de la solicitud", error)));
  }
  return "pending" as const;
}

async function notifyAdmins(ticketId: string) {
  const [row] = await db
    .select({ username: user.username, email: user.email, message: supportTicket.message })
    .from(supportTicket)
    .innerJoin(user, eq(supportTicket.userId, user.id))
    .where(eq(supportTicket.id, ticketId));
  if (!row) return;
  const who = row.username ? `@${row.username} (${row.email})` : row.email;
  await sendEmail({
    to: ADMIN_EMAILS,
    subject: `Solicitud de cuenta ilimitada: ${row.username ? `@${row.username}` : row.email}`,
    ...simpleEmail({
      intro: [`${who} pidió una cuenta ilimitada.`, row.message ? `Mensaje: ${row.message}` : ""].filter(Boolean).join("\n"),
      button: "Revisar en moderación",
      url: `${baseUrl}/admin?tab=accounts`,
      outro: "La puedes aprobar o rechazar desde la pestaña Cuentas.",
    }),
    idempotencyKey: `unlimited-request/${ticketId}`,
  });
}

/** Solicitudes pendientes, con datos para decidir: cuántos links tiene y desde cuándo existe la cuenta. */
export function listOpenRequests() {
  return db
    .select({
      id: supportTicket.id,
      message: supportTicket.message,
      createdAt: supportTicket.createdAt,
      userId: user.id,
      username: user.username,
      email: user.email,
      userCreatedAt: user.createdAt,
      links: db.$count(link, eq(link.userId, user.id)),
    })
    .from(supportTicket)
    .innerJoin(user, eq(supportTicket.userId, user.id))
    .where(eq(supportTicket.status, "open"))
    .orderBy(desc(supportTicket.createdAt));
}

export async function countOpenRequests() {
  const [{ total }] = await db.select({ total: count() }).from(supportTicket).where(eq(supportTicket.status, "open"));
  return total;
}

export function listUnlimitedUsers() {
  return db
    .select({ id: user.id, username: user.username, email: user.email, links: db.$count(link, eq(link.userId, user.id)) })
    .from(user)
    .where(eq(user.unlimited, true))
    .orderBy(user.email);
}

/** Aprueba o rechaza una solicitud y le avisa al usuario por correo, en su idioma. */
export async function resolveRequest(ticketId: string, approve: boolean, by: string) {
  const [ticket] = await db
    .update(supportTicket)
    .set({ status: approve ? "approved" : "rejected", resolvedAt: new Date(), resolvedBy: by })
    .where(and(eq(supportTicket.id, ticketId), eq(supportTicket.status, "open")))
    .returning();
  if (!ticket) return;
  if (approve) await db.update(user).set({ unlimited: true }).where(eq(user.id, ticket.userId));

  const [account] = await db.select({ email: user.email }).from(user).where(eq(user.id, ticket.userId));
  if (!account) return;
  const t = dictionaries[isLocale(ticket.locale) ? ticket.locale : "es"].email.unlimited;
  const copy = approve ? t.approved : t.rejected;
  after(() =>
    sendEmail({
      to: account.email,
      subject: copy.subject,
      ...simpleEmail({ intro: copy.intro, button: t.button, url: `${baseUrl}/dashboard`, outro: t.outro }),
      idempotencyKey: `unlimited-${approve ? "approved" : "rejected"}/${ticketId}`,
    }).catch((error) => console.error("No se pudo avisar al usuario", error)),
  );
}

/** Da o quita ilimitado directamente. Al darlo, cierra como aprobada su solicitud pendiente, si había. */
export async function setUnlimited(userId: string, unlimited: boolean, by: string) {
  await db.update(user).set({ unlimited }).where(eq(user.id, userId));
  if (unlimited) {
    await db
      .update(supportTicket)
      .set({ status: "approved", resolvedAt: new Date(), resolvedBy: by })
      .where(and(eq(supportTicket.userId, userId), eq(supportTicket.status, "open")));
  }
}

/** Busca una cuenta por correo o usuario (con o sin @). */
export async function findUser(query: string) {
  const q = query.trim().replace(/^@/, "");
  if (!q) return null;
  const [found] = await db
    .select({ id: user.id, username: user.username, email: user.email, unlimited: user.unlimited })
    .from(user)
    // Comparación exacta sin distinguir mayúsculas (sin comodines de LIKE).
    .where(or(sql`lower(${user.email}) = lower(${q})`, sql`lower(${user.username}) = lower(${q})`))
    .limit(1);
  return found ?? null;
}
