import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Base de datos solo para pruebas: se crea y se migra sola. Nunca usa la de desarrollo.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://cut:cut@localhost:5433/cut_test";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    // Las pruebas de base de datos comparten tablas: una a la vez.
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
      BETTER_AUTH_SECRET: "secreto-de-pruebas",
      BETTER_AUTH_URL: "https://cut.test",
      // Límites bajos para probarlos sin crear miles de links.
      LINKS_PER_HOUR: "3",
      LINKS_PER_DAY: "5",
      ADMIN_EMAILS: "admin@cut.test",
      BLOCKED_DOMAINS: "malo.example",
      // Sin Resend: los correos se imprimen en vez de mandarse.
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      GOOGLE_SAFE_BROWSING_KEY: "",
    },
  },
});
