// Corre las migraciones antes del build, salvo en los previews de Vercel.
// Así una rama sin revisar nunca toca la base de producción. Las migraciones solo
// aplican los archivos de drizzle/ que faltan; nunca borran ni recrean tablas.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "preview") {
  console.log("Preview de Vercel: se omiten las migraciones.");
} else {
  execSync("drizzle-kit migrate", { stdio: "inherit" });
}
