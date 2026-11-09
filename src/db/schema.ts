import { bigint, boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ReportReason } from "@/lib/limits";

// Tablas que Better Auth necesita (user, session, account, verification).
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Campos del plugin username de Better Auth.
  username: text("username").unique(),
  displayUsername: text("display_username"),
  // Cuenta de confianza: no tiene límite de links por hora ni por día. Se asigna en /admin.
  unlimited: boolean("unlimited").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Contador del rate limit de Better Auth. Vive en la base porque en serverless cada
// instancia tiene su propia memoria y un límite en memoria casi no frena nada.
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  // Milisegundos desde epoch, como lo guarda Better Auth.
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// Tablas propias de cut.
export const link = pgTable(
  "link",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    url: text("url").notNull(),
    // Null mientras el link sea anónimo; se llena cuando alguien lo reclama.
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    // Hash de la cookie del navegador que creó el link sin cuenta.
    anonId: text("anon_id"),
    // Hash de la IP, solo para limitar cuántos links anónimos se crean por hora.
    ipHash: text("ip_hash"),
    clicks: integer("clicks").notNull().default(0),
    // Lo llena un administrador al resolver un reporte: el link deja de redirigir.
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("link_user_id_idx").on(t.userId),
    // Para contar rápido cuántos links creó un usuario en la última hora o día.
    index("link_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("link_anon_id_idx").on(t.anonId),
    index("link_ip_hash_created_at_idx").on(t.ipHash, t.createdAt),
  ],
);

export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Solo guardamos el hash; el prefijo sirve para que el usuario reconozca la llave.
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("api_key_user_id_idx").on(t.userId)],
);

// Reportes de links sospechosos. Se copian slug y url para conservar el historial aunque
// el link se borre después.
export const report = pgTable(
  "report",
  {
    id: text("id").primaryKey(),
    linkId: text("link_id").references(() => link.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    url: text("url").notNull(),
    reason: text("reason").$type<ReportReason>().notNull(),
    details: text("details"),
    reporterEmail: text("reporter_email"),
    // Idioma de quien reportó, para avisarle del resultado en ese idioma.
    locale: text("locale").notNull().default("es"),
    // Cuándo se le avisó del resultado (automático o a mano) y, si fue a mano, qué se le escribió.
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    reply: text("reply"),
    // Hash de la IP, solo para limitar cuántos reportes manda alguien por hora.
    ipHash: text("ip_hash"),
    status: text("status").$type<ReportStatus>().notNull().default("open"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("report_status_created_at_idx").on(t.status, t.createdAt),
    index("report_link_id_idx").on(t.linkId),
    index("report_ip_hash_created_at_idx").on(t.ipHash, t.createdAt),
  ],
);

// Dominios bloqueados desde el portal (además de los de BLOCKED_DOMAINS). Incluye subdominios.
export const blockedDomain = pgTable("blocked_domain", {
  domain: text("domain").primaryKey(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** open: pendiente · disabled: se desactivó el link · dismissed: se descartó. */
export type ReportStatus = "open" | "disabled" | "dismissed";

// Solicitudes de soporte. Por ahora solo hay un tipo: pedir una cuenta ilimitada.
export const supportTicket = pgTable(
  "support_ticket",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"unlimited">().notNull().default("unlimited"),
    message: text("message"),
    // Idioma de quien pidió, para responderle por correo en ese idioma.
    locale: text("locale").notNull().default("es"),
    status: text("status").$type<TicketStatus>().notNull().default("open"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("support_ticket_status_created_at_idx").on(t.status, t.createdAt),
    index("support_ticket_user_id_idx").on(t.userId),
  ],
);

export type TicketStatus = "open" | "approved" | "rejected";

export type Link = typeof link.$inferSelect;
export type ApiKey = typeof apiKey.$inferSelect;
