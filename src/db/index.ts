import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { client?: postgres.Sql };

// prepare: false para que funcione con el pooler de Neon (PgBouncer).
// DATABASE_POOL_MAX=1 sirve para Postgres embebidos (PGlite) que no aguantan conexiones en paralelo.
const client =
  globalForDb.client ??
  postgres(process.env.DATABASE_URL!, { prepare: false, max: Number(process.env.DATABASE_POOL_MAX) || 5 });

if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
