import { and, desc, eq } from "drizzle-orm";
import { customAlphabet, nanoid } from "nanoid";
import { db } from "@/db";
import { link, type Link } from "@/db/schema";

export const baseUrl = (
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const shortUrl = (slug: string) => `${baseUrl}/${slug}`;

// Rutas de la app: un slug con estos nombres nunca se podría visitar.
const RESERVED = new Set([
  "api", "login", "signup", "logout", "dashboard", "keys", "docs", "settings",
  "admin", "_next", "favicon.ico", "robots.txt", "sitemap.xml",
]);

const SLUG_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;
// 57 caracteres: sin los que se confunden al leer (0/O, 1/l/I).
const randomSlug = customAlphabet("abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

export class LinkError extends Error {
  constructor(message: string, public status: 400 | 404 | 409 | 429 = 400) {
    super(message);
  }
}

function normalizeUrl(raw: string) {
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    throw new LinkError("Ese link no parece una URL válida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new LinkError("Solo se aceptan links http o https.");
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    throw new LinkError("Ese link no parece una URL válida.");
  }
  if (url.host === new URL(baseUrl).host) {
    throw new LinkError("Ese link ya es de cut.");
  }
  return url.toString();
}

/** Dueño de un link nuevo: un usuario, o un navegador sin cuenta. */
export type LinkOwner = { userId: string } | { anonId: string; ipHash: string };

export async function createLink(owner: LinkOwner, rawUrl: string, customSlug?: string | null) {
  const url = normalizeUrl(rawUrl);
  const wanted = customSlug?.trim();

  if (wanted) {
    if (!SLUG_PATTERN.test(wanted)) {
      throw new LinkError("El alias debe tener de 3 a 50 caracteres: letras, números, - o _.");
    }
    if (RESERVED.has(wanted.toLowerCase())) throw new LinkError("Ese alias está reservado.", 409);
    const [created] = await db
      .insert(link)
      .values({ id: nanoid(), slug: wanted, url, ...owner })
      .onConflictDoNothing({ target: link.slug })
      .returning();
    if (!created) throw new LinkError("Ese alias ya está ocupado.", 409);
    return created;
  }

  // 57^5 ≈ 600 millones de slugs. Si chocan cinco veces seguidas (la tabla ya está muy llena),
  // los siguientes intentos usan 6 caracteres para no fallar nunca.
  for (let attempt = 0; attempt < 10; attempt++) {
    const [created] = await db
      .insert(link)
      .values({ id: nanoid(), slug: randomSlug(attempt < 5 ? 5 : 6), url, ...owner })
      .onConflictDoNothing({ target: link.slug })
      .returning();
    if (created) return created;
  }
  throw new Error("No se pudo generar un slug único.");
}

export function listLinks(userId: string, limit = 100) {
  return db
    .select()
    .from(link)
    .where(eq(link.userId, userId))
    .orderBy(desc(link.createdAt))
    .limit(limit);
}

export async function getLink(userId: string, slug: string) {
  const [found] = await db
    .select()
    .from(link)
    .where(and(eq(link.userId, userId), eq(link.slug, slug)));
  return found;
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
  url: l.url,
  clicks: l.clicks,
  createdAt: l.createdAt.toISOString(),
  lastClickedAt: l.lastClickedAt?.toISOString() ?? null,
});

export type CreateLinkState =
  | { ok: true; url: string; shortUrl: string; at: number }
  | { ok: false; error: string }
  | null;

/** Convierte el resultado de crear un link en el estado que muestra el formulario. */
export async function toCreateLinkState(create: () => Promise<Link>): Promise<CreateLinkState> {
  try {
    const created = await create();
    // `at` hace que la animación se repita aunque se acorte el mismo link dos veces.
    return { ok: true, url: created.url, shortUrl: shortUrl(created.slug), at: Date.now() };
  } catch (error) {
    if (error instanceof LinkError) return { ok: false, error: error.message };
    throw error;
  }
}
