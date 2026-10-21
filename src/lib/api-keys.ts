import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { apiKey } from "@/db/schema";

const hash = (key: string) => createHash("sha256").update(key).digest("hex");

/** Crea una llave y devuelve el valor en claro. Es la única vez que se puede ver. */
export async function createApiKey(userId: string, name: string) {
  const key = `cut_${randomBytes(24).toString("base64url")}`;
  await db.insert(apiKey).values({
    id: nanoid(),
    userId,
    name: name.trim() || "Sin nombre",
    prefix: key.slice(0, 10),
    keyHash: hash(key),
  });
  return key;
}

export function listApiKeys(userId: string) {
  return db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
    })
    .from(apiKey)
    .where(eq(apiKey.userId, userId))
    .orderBy(desc(apiKey.createdAt));
}

export async function revokeApiKey(userId: string, id: string) {
  await db.delete(apiKey).where(and(eq(apiKey.userId, userId), eq(apiKey.id, id)));
}

/** Devuelve el userId dueño de la llave del header Authorization, o null. */
export async function authenticateApiKey(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const key = header.match(/^Bearer\s+(cut_\S+)$/i)?.[1];
  if (!key) return null;

  const [found] = await db
    .update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKey.keyHash, hash(key)))
    .returning({ userId: apiKey.userId });
  return found?.userId ?? null;
}
