import { and, count, desc, eq, gt, inArray, isNotNull, isNull, ne, sql, type SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { after } from "next/server";
import { db } from "@/db";
import { blockedDomain, link, report, user, type ReportStatus } from "@/db/schema";

type Report = typeof report.$inferSelect;
import { ADMIN_EMAILS } from "@/lib/admin";
import { currentIpHash } from "@/lib/anon";
import { sendEmail, simpleEmail } from "@/lib/email";
import { REPORT_DETAILS_MAX, type ReportReason } from "@/lib/limits";
import { baseUrl, LinkError } from "@/lib/links";
import { ALIAS_PATTERN } from "@/lib/slug";

const MAX_REPORTS_PER_HOUR = 5;

/** Acepta el link completo (`https://cut.lat/abc`), sin protocolo, con `/` o solo el slug. */
export function parseSlug(input: string) {
  const slug = input.trim().replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() ?? "";
  return ALIAS_PATTERN.test(slug) ? slug : null;
}

export async function createReport(input: {
  link: string;
  reason: ReportReason;
  details: string;
  email: string;
}) {
  const slug = parseSlug(input.link);
  const [target] = slug
    ? await db.select({ id: link.id, url: link.url }).from(link).where(eq(link.slug, slug))
    : [];
  if (!slug || !target) throw new LinkError("reportNotFound", 404);

  const ipHash = await currentIpHash();
  const [{ recent }] = await db
    .select({ recent: count() })
    .from(report)
    .where(and(eq(report.ipHash, ipHash), gt(report.createdAt, new Date(Date.now() - 3600_000))));
  if (recent >= MAX_REPORTS_PER_HOUR) throw new LinkError("reportLimit", 429);

  // Solo se avisa con el primer reporte pendiente de cada link, para no llenar el correo.
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(report)
    .where(and(eq(report.linkId, target.id), eq(report.status, "open")));

  const details = input.details.trim().slice(0, REPORT_DETAILS_MAX) || null;
  const id = nanoid();
  await db.insert(report).values({
    id,
    linkId: target.id,
    slug,
    url: target.url,
    reason: input.reason,
    details,
    reporterEmail: input.email.trim().slice(0, 200) || null,
    ipHash,
  });

  if (pending === 0 && ADMIN_EMAILS.length > 0) {
    // Después de responder: quien reporta no espera al correo, y si falla no pierde su reporte.
    after(() =>
      notifyAdmins(id, slug, target.url, input.reason, details).catch((error) =>
        console.error("No se pudo avisar del reporte", error),
      ),
    );
  }
}

export const REASON_LABELS: Record<ReportReason, string> = {
  phishing: "Phishing o robo de datos",
  malware: "Malware o descarga peligrosa",
  spam: "Spam",
  other: "Otro",
};

// El portal de moderación está en español, así que el aviso también.
async function notifyAdmins(id: string, slug: string, url: string, reason: ReportReason, details: string | null) {
  const intro = [
    `Alguien reportó ${baseUrl.replace(/^https?:\/\//, "")}/${slug}.`,
    `Motivo: ${REASON_LABELS[reason]}.`,
    `Destino: ${url}`,
    details ? `Detalles: ${details}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  await sendEmail({
    to: ADMIN_EMAILS,
    subject: `Reporte nuevo: /${slug}`,
    ...simpleEmail({
      intro,
      button: "Abrir moderación",
      url: `${baseUrl}/admin`,
      outro: "Solo avisamos con el primer reporte de cada link mientras siga pendiente.",
    }),
    idempotencyKey: `report/${id}`,
  });
}

/** Reportes agrupados por link, del más reciente al más viejo. */
export async function listReportGroups(status: "open" | "resolved") {
  const rows = await db
    .select({
      report,
      link: { id: link.id, url: link.url, disabledAt: link.disabledAt, clicks: link.clicks, createdAt: link.createdAt },
      owner: user.username,
      ownerEmail: user.email,
    })
    .from(report)
    .leftJoin(link, eq(report.linkId, link.id))
    .leftJoin(user, eq(link.userId, user.id))
    .where(status === "open" ? eq(report.status, "open") : ne(report.status, "open"))
    .orderBy(desc(status === "open" ? report.createdAt : report.resolvedAt))
    .limit(status === "open" ? 500 : 200);

  // Un grupo por link; si el link ya se borró, por slug.
  type Group = Omit<(typeof rows)[number], "report"> & { key: string; slug: string; reports: Report[] };
  const groups = new Map<string, Group>();
  for (const { report: r, ...rest } of rows) {
    const key = r.linkId ?? `slug:${r.slug}`;
    if (!groups.has(key)) groups.set(key, { ...rest, key, slug: r.slug, reports: [] });
    groups.get(key)!.reports.push(r);
  }
  return [...groups.values()];
}

export type ReportGroup = Awaited<ReturnType<typeof listReportGroups>>[number];

function resolveReports(where: SQL | undefined, status: Exclude<ReportStatus, "open">, by: string) {
  return db
    .update(report)
    .set({ status, resolvedAt: new Date(), resolvedBy: by })
    .where(and(eq(report.status, "open"), where));
}

/** Clave del grupo → condición sobre los reportes (por link, o por slug si el link ya se borró). */
const groupWhere = (key: string) =>
  key.startsWith("slug:")
    ? and(isNull(report.linkId), eq(report.slug, key.slice(5)))
    : eq(report.linkId, key);

export async function disableLink(linkId: string, by: string) {
  await db.update(link).set({ disabledAt: new Date() }).where(and(eq(link.id, linkId), isNull(link.disabledAt)));
  await resolveReports(eq(report.linkId, linkId), "disabled", by);
}

export async function enableLink(linkId: string) {
  await db.update(link).set({ disabledAt: null }).where(eq(link.id, linkId));
}

export async function dismissReports(key: string, by: string) {
  await resolveReports(groupWhere(key), "dismissed", by);
}

/** Host de una URL en SQL (sin `www.`), para encontrar todos los links hacia un dominio. */
const hostOf = sql`lower(regexp_replace(substring(${link.url} from '^[a-zA-Z][a-zA-Z0-9+.-]*://(?:[^@/]*@)?([^/:?#]+)'), '^www\\.', ''))`;

/**
 * Bloquea un dominio y sus subdominios: no se pueden crear links hacia él y se desactivan
 * los que ya existen. Sus reportes pendientes quedan resueltos.
 */
export async function blockDomain(domain: string, by: string, note?: string) {
  const clean = domain.trim().toLowerCase().replace(/^www\./, "");
  if (!clean.includes(".")) return 0;
  await db.insert(blockedDomain).values({ domain: clean, note }).onConflictDoNothing();
  const disabled = await db
    .update(link)
    .set({ disabledAt: new Date() })
    .where(and(isNull(link.disabledAt), sql`(${hostOf} = ${clean} or ${hostOf} like ${"%." + clean})`))
    .returning({ id: link.id });
  if (disabled.length > 0) {
    await resolveReports(inArray(report.linkId, disabled.map((l) => l.id)), "disabled", by);
  }
  return disabled.length;
}

export const listBlockedDomains = () => db.select().from(blockedDomain).orderBy(desc(blockedDomain.createdAt));

export async function unblockDomain(domain: string) {
  await db.delete(blockedDomain).where(eq(blockedDomain.domain, domain));
}

export async function countOpenReports() {
  const [{ total }] = await db.select({ total: count() }).from(report).where(eq(report.status, "open"));
  return total;
}

/** Links desactivados que no tienen reportes (p. ej. por bloquear su dominio). */
export function listDisabledLinks() {
  return db
    .select({ id: link.id, slug: link.slug, url: link.url, disabledAt: link.disabledAt })
    .from(link)
    .where(isNotNull(link.disabledAt))
    .orderBy(desc(link.disabledAt))
    .limit(100);
}
