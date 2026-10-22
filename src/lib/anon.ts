import { createHash, randomBytes } from "node:crypto";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { link } from "@/db/schema";
import { createLink, LinkError } from "@/lib/links";

const COOKIE = "cut_anon";
const MAX_LINKS_PER_HOUR = 15;

const hash = (value: string) =>
  createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET}:${value}`).digest("hex");

/** Hash del token anónimo de este navegador, o null si nunca ha creado un link. */
export async function currentAnonId() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? hash(token) : null;
}

/** Crea un link sin cuenta. Solo se puede llamar desde una server action (escribe cookies). */
export async function createAnonLink(rawUrl: string) {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ?? headerList.get("x-real-ip") ?? "local";
  const ipHash = hash(`ip:${ip}`);

  const [{ recent }] = await db
    .select({ recent: count() })
    .from(link)
    .where(and(eq(link.ipHash, ipHash), gt(link.createdAt, new Date(Date.now() - 3600_000))));
  if (recent >= MAX_LINKS_PER_HOUR) {
    throw new LinkError("Llegaste al límite de links sin cuenta por ahora. Crea una cuenta gratis para seguir.", 429);
  }

  const cookieStore = await cookies();
  let token = cookieStore.get(COOKIE)?.value;
  if (!token) {
    token = randomBytes(24).toString("base64url");
    cookieStore.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return createLink({ anonId: hash(token), ipHash }, rawUrl);
}

const unclaimed = (anonId: string) => and(eq(link.anonId, anonId), isNull(link.userId));

export async function listAnonLinks(anonId: string) {
  return db.select().from(link).where(unclaimed(anonId)).orderBy(desc(link.createdAt)).limit(20);
}

export async function countAnonLinks(anonId: string) {
  const [{ total }] = await db.select({ total: count() }).from(link).where(unclaimed(anonId));
  return total;
}

/**
 * Pasa a `userId` los links que este navegador creó sin cuenta.
 * El filtro `user_id IS NULL` garantiza que nunca se toma un link que ya tiene dueño.
 */
export async function claimAnonLinks(anonId: string, userId: string) {
  const claimed = await db
    .update(link)
    .set({ userId, anonId: null, ipHash: null })
    .where(unclaimed(anonId))
    .returning({ id: link.id });
  return claimed.length;
}
