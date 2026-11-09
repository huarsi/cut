import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Crea la base de pruebas si no existe y le aplica las migraciones de drizzle/. */
export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "postgres://cut:cut@localhost:5433/cut_test");
  const name = url.pathname.slice(1);

  const admin = postgres({ ...connection(url), database: "postgres", max: 1, onnotice: () => {} });
  const [exists] = await admin`select 1 from pg_database where datname = ${name}`;
  if (!exists) await admin.unsafe(`create database "${name}"`);
  await admin.end();

  const client = postgres(url.toString(), { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
}

const connection = (url: URL) => ({
  host: url.hostname,
  port: Number(url.port || 5432),
  username: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
});
