import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";

/** Vacía las tablas entre pruebas. */
export async function resetDb() {
  await db.execute(
    sql`truncate table "report", "blocked_domain", "support_ticket", "api_key", "link", "session", "account", "verification", "rate_limit", "user" cascade`,
  );
}

export async function createUser(overrides: Partial<typeof user.$inferInsert> = {}) {
  const id = nanoid();
  const [created] = await db
    .insert(user)
    .values({ id, name: "Prueba", email: `${id}@cut.test`, username: `u${id.slice(0, 8).toLowerCase()}`, ...overrides })
    .returning();
  return created;
}
