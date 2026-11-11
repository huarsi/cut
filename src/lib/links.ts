import { and, count, desc, eq, gt, sql, sum } from "drizzle-orm";
import { customAlphabet, nanoid } from "nanoid";
import { db } from "@/db";
import { link, user, type Link } from "@/db/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { getT } from "@/i18n/server";
import { URL_MAX } from "@/lib/limits";
import { isBlockedHostAnywhere, isFlaggedBySafeBrowsing } from "@/lib/safety";
import { ALIAS_PATTERN, SLUG_LENGTH } from "@/lib/slug";

export const baseUrl = (
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const shortUrl = (slug: string) => `${baseUrl}/${slug}`;
export const shortHost = new URL(baseUrl).host;
// Sin protocolo, para mostrarlo o mandarlo en un mensaje ("cut.lat/k3Rp").
export const shortText = (slug: string) => `${shortHost}/${slug}`;

// Rutas de la app: un slug con estos nombres nunca se podría visitar.
const RESERVED = new Set([
  "api", "login", "signup", "logout", "dashboard", "keys", "docs", "settings", "account",
  "forgot-password", "reset-password", "report", "admin", "_next", "opengraph-image",
  "favicon.ico", "icon.svg", "apple-icon.png", "robots.txt", "sitemap.xml",
]);

// 57 caracteres: sin los que se confunden al leer (0/O, 1/l/I).
const randomSlug = customAlphabet("abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", SLUG_LENGTH.default);

export type LinkErrorCode = keyof Dictionary["errors"];

/** Error esperado al crear un link. El código se traduce donde se muestra (formulario o API). */
export class LinkError extends Error {
  constructor(public code: LinkErrorCode, public status: 400 | 404 | 409 | 429 = 400) {
    super(code);
  }
}

/** Valida la URL de destino y la devuelve normalizada. Incluye los filtros contra abuso. */
async function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (value.length > URL_MAX) throw new LinkError("urlTooLong");
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    throw new LinkError("invalidUrl");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new LinkError("onlyHttp");
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    throw new LinkError("invalidUrl");
  }
  if (url.host === new URL(baseUrl).host) {
    throw new LinkError("alreadyCut");
  }
  const normalized = url.toString();
  if ((await isBlockedHostAnywhere(url.hostname)) || (await isFlaggedBySafeBrowsing(normalized))) {
    throw new LinkError("unsafeUrl");
  }
  return normalized;
}

/** Links que puede crear una cuenta normal. Las cuentas ilimitadas (de confianza) no tienen tope. */
export const LINK_LIMITS = {
  hour: Number(process.env.LINKS_PER_HOUR) || 300,
  day: Number(process.env.LINKS_PER_DAY) || 3000,
};

/** Links creados en la última hora y en las últimas 24 horas, y si la cuenta es ilimitada. */
export async function linkUsage(userId: string) {
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const hourAgo = new Date(Date.now() - 3600_000);
  const [[usage], [account]] = await Promise.all([
    db
      .select({
        hour: sql<number>`count(*) filter (where ${gt(link.createdAt, hourAgo)})`.mapWith(Number),
        day: count(),
      })
      .from(link)
      .where(and(eq(link.userId, userId), gt(link.createdAt, dayAgo))),
    db.select({ unlimited: user.unlimited }).from(user).where(eq(user.id, userId)),
  ]);
  return { ...usage, unlimited: account?.unlimited ?? false };
}

async function assertUnderLimit(userId: string) {
  const usage = await linkUsage(userId);
  if (!usage.unlimited && (usage.hour >= LINK_LIMITS.hour || usage.day >= LINK_LIMITS.day)) {
    throw new LinkError("userLimit", 429);
  }
}

/** Dueño de un link nuevo: un usuario, o un navegador sin cuenta. */
export type LinkOwner = { userId: string } | { anonId: string; ipHash: string };

export async function createLink(
  owner: LinkOwner,
  rawUrl: string,
  customSlug?: string | null,
  length: number = SLUG_LENGTH.default,
) {
  const url = await normalizeUrl(rawUrl);
  if ("userId" in owner) await assertUnderLimit(owner.userId);
  const wanted = customSlug?.trim();

  if (wanted) {
    if (!ALIAS_PATTERN.test(wanted)) throw new LinkError("slugFormat");
    if (RESERVED.has(wanted.toLowerCase())) throw new LinkError("slugReserved", 409);
    const [created] = await db
      .insert(link)
      .values({ id: nanoid(), slug: wanted, url, ...owner })
      .onConflictDoNothing({ target: link.slug })
      .returning();
    if (!created) throw new LinkError("slugTaken", 409);
    return created;
  }

  // Con 5 caracteres hay 57^5 ≈ 600 millones de slugs (con 3, apenas ~185 mil). Si chocan
  // cinco veces seguidas porque ese largo ya está muy lleno, se prueba con un carácter más.
  for (let attempt = 0; attempt < 10; attempt++) {
    const [created] = await db
      .insert(link)
      .values({ id: nanoid(), slug: randomSlug(length + Math.floor(attempt / 5)), url, ...owner })
      .onConflictDoNothing({ target: link.slug })
      .returning();
    if (created) return created;
  }
  throw new Error("No se pudo generar un slug único.");
}

export function listLinks(userId: string, limit = 50, offset = 0) {
  return db
    .select()
    .from(link)
    .where(eq(link.userId, userId))
    .orderBy(desc(link.createdAt), desc(link.id))
    .limit(limit)
    .offset(offset);
}

/** Totales de todos los links del usuario, no solo de la página que se muestra. */
export async function linkStats(userId: string) {
  const [stats] = await db
    .select({ links: count(), clicks: sum(link.clicks).mapWith(Number) })
    .from(link)
    .where(eq(link.userId, userId));
  return { links: stats.links, clicks: stats.clicks ?? 0 };
}

export async function getLink(userId: string, slug: string) {
  const [found] = await db
    .select()
    .from(link)
    .where(and(eq(link.userId, userId), eq(link.slug, slug)));
  return found;
}

/** Cambia el destino de un link. Conserva el slug y los clics. */
export async function updateLinkUrl(userId: string, slug: string, rawUrl: string) {
  const url = await normalizeUrl(rawUrl);
  const [updated] = await db
    .update(link)
    .set({ url })
    .where(and(eq(link.userId, userId), eq(link.slug, slug)))
    .returning();
  if (!updated) throw new LinkError("notFound", 404);
  return updated;
}

export async function deleteLink(userId: string, slug: string) {
  const deleted = await db
    .delete(link)
    .where(and(eq(link.userId, userId), eq(link.slug, slug)))
    .returning({ id: link.id });
  return deleted.length > 0;
}

export const serializeLink = (l: Link) => ({
  slug: l.slug,
  shortUrl: shortUrl(l.slug),
  short: shortText(l.slug),
  url: l.url,
  clicks: l.clicks,
  createdAt: l.createdAt.toISOString(),
  lastClickedAt: l.lastClickedAt?.toISOString() ?? null,
  disabled: l.disabledAt !== null,
});

export type CreateLinkState =
  | { ok: true; url: string; shortUrl: string; at: number }
  | { ok: false; error: string; code: LinkErrorCode }
  | null;

/** Convierte el resultado de crear un link en el estado que muestra el formulario. */
export async function toCreateLinkState(create: () => Promise<Link>): Promise<CreateLinkState> {
  try {
    const created = await create();
    // `at` hace que la animación se repita aunque se acorte el mismo link dos veces.
    return { ok: true, url: created.url, shortUrl: shortUrl(created.slug), at: Date.now() };
  } catch (error) {
    if (error instanceof LinkError) return { ok: false, error: (await getT()).errors[error.code], code: error.code };
    throw error;
  }
}
