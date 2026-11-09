import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { link, report, user } from "@/db/schema";
import { createLink } from "@/lib/links";
import { blockDomain, createReport, disableLink, dismissReports, listReportGroups, replyToReporter } from "@/lib/reports";
import { requestUnlimited, resolveRequest, setUnlimited, unlimitedStatus } from "@/lib/support";
import { pendingAfter, setRequest } from "../setup";
import { createUser, resetDb } from "./helpers";

beforeEach(resetDb);

const disabled = async (slug: string) =>
  (await db.select({ d: link.disabledAt }).from(link).where(eq(link.slug, slug)))[0].d !== null;

describe("reportes", () => {
  it("avisa por correo solo con el primer reporte pendiente de cada link", async () => {
    const owner = await createUser({ unlimited: true });
    await createLink({ userId: owner.id }, "example.com", "sospecha");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await createReport({ link: "https://cut.test/sospecha", reason: "phishing", details: "pide la clave", email: "" });
    setRequest({ ip: "203.0.113.2" });
    await createReport({ link: "sospecha", reason: "spam", details: "", email: "" });
    await Promise.all(pendingAfter);

    const notices = log.mock.calls.filter(([text]) => String(text).includes("Reporte nuevo: /sospecha"));
    expect(notices).toHaveLength(1);
    log.mockRestore();

    const [group] = await listReportGroups("open");
    expect(group.reports).toHaveLength(2);
  });

  it("rechaza links que no existen y limita a 5 reportes por hora por IP", async () => {
    await expect(createReport({ link: "noexiste", reason: "spam", details: "", email: "" })).rejects.toMatchObject({
      code: "reportNotFound",
    });
    const owner = await createUser({ unlimited: true });
    await createLink({ userId: owner.id }, "example.com", "muchos");
    vi.spyOn(console, "log").mockImplementation(() => {});
    for (let i = 0; i < 5; i++) await createReport({ link: "muchos", reason: "spam", details: "", email: "" });
    await expect(createReport({ link: "muchos", reason: "spam", details: "", email: "" })).rejects.toMatchObject({
      code: "reportLimit",
    });
  });

  it("desactivar un link cierra sus reportes; descartar los marca como descartados", async () => {
    const owner = await createUser({ unlimited: true });
    await createLink({ userId: owner.id }, "example.com", "malo1");
    await createLink({ userId: owner.id }, "example.org", "bueno1");
    vi.spyOn(console, "log").mockImplementation(() => {});
    await createReport({ link: "malo1", reason: "phishing", details: "", email: "" });
    await createReport({ link: "bueno1", reason: "other", details: "", email: "" });

    const [malo] = await db.select().from(link).where(eq(link.slug, "malo1"));
    const [bueno] = await db.select().from(link).where(eq(link.slug, "bueno1"));
    await disableLink(malo.id, "admin@cut.test");
    await dismissReports(bueno.id, "admin@cut.test");

    expect(await disabled("malo1")).toBe(true);
    expect(await disabled("bueno1")).toBe(false);
    const statuses = await db.select({ slug: report.slug, status: report.status }).from(report);
    expect(statuses).toEqual(
      expect.arrayContaining([
        { slug: "malo1", status: "disabled" },
        { slug: "bueno1", status: "dismissed" },
      ]),
    );
  });
});

describe("avisar a quien reportó", () => {
  /** Correos impresos en la terminal (sin Resend), con el asunto o texto pedido. */
  const sent = (log: { mock: { calls: unknown[][] } }, text: string) =>
    log.mock.calls.filter(([t]) => String(t).includes(text)).map(([t]) => String(t));

  async function reported(slug: string, reports: { email: string; ip: string; lang?: string }[]) {
    const owner = await createUser({ unlimited: true });
    await createLink({ userId: owner.id }, "example.com", slug);
    for (const r of reports) {
      setRequest({ ip: r.ip, cookies: r.lang ? { cut_lang: r.lang } : {} });
      await createReport({ link: slug, reason: "phishing", details: "", email: r.email });
    }
    return (await db.select().from(link).where(eq(link.slug, slug)))[0];
  }

  it("al resolver avisa una vez por persona, en su idioma, y no a quien no dejó correo", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const target = await reported("aviso1", [
      { email: "ana@example.com", ip: "203.0.113.10" },
      { email: "ANA@example.com", ip: "203.0.113.11" },
      { email: "bob@example.com", ip: "203.0.113.12", lang: "en" },
      { email: "", ip: "203.0.113.13" },
    ]);
    await Promise.all(pendingAfter);
    pendingAfter.length = 0;

    await disableLink(target.id, "admin@cut.test");
    await Promise.all(pendingAfter);

    expect(sent(log, "Revisamos tu reporte")).toHaveLength(1);
    expect(sent(log, "Revisamos tu reporte")[0]).toContain("lo desactivamos");
    expect(sent(log, "We reviewed your report")).toHaveLength(1);
    const rows = await db.select().from(report).where(eq(report.slug, "aviso1"));
    expect(rows.filter((r) => r.notifiedAt)).toHaveLength(3);
  });

  it("sin la casilla no se manda nada", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const target = await reported("aviso2", [{ email: "ana@example.com", ip: "203.0.113.20" }]);
    await dismissReports(target.id, "admin@cut.test", false);
    await Promise.all(pendingAfter);
    expect(sent(log, "Revisamos tu reporte")).toHaveLength(0);
    expect((await db.select().from(report).where(eq(report.slug, "aviso2")))[0].notifiedAt).toBeNull();
  });

  it("la respuesta a mano llega con responder-a de quien modera y evita el aviso automático", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const target = await reported("aviso3", [
      { email: "ana@example.com", ip: "203.0.113.30" },
      { email: "bob@example.com", ip: "203.0.113.31" },
    ]);
    const [ana] = await db.select().from(report).where(eq(report.reporterEmail, "ana@example.com"));

    expect(await replyToReporter(ana.id, "  ", "admin@cut.test")).toMatchObject({ ok: false });
    expect(await replyToReporter(ana.id, "Lo estamos revisando, gracias.", "admin@cut.test")).toMatchObject({ ok: true });
    const [reply] = sent(log, "Sobre tu reporte de");
    expect(reply).toContain("Para: ana@example.com");
    expect(reply).toContain("Responder a: admin@cut.test");
    expect(reply).toContain("Lo estamos revisando, gracias.");

    await dismissReports(target.id, "admin@cut.test");
    await Promise.all(pendingAfter);
    const auto = sent(log, "Revisamos tu reporte");
    expect(auto).toHaveLength(1);
    expect(auto[0]).toContain("bob@example.com");
    expect(auto[0]).toContain("no encontramos un problema");
  });
});

describe("bloquear dominios", () => {
  it("desactiva el dominio y sus subdominios, pero no dominios parecidos", async () => {
    const u = await createUser({ unlimited: true });
    const urls = {
      raiz: "https://evil-bank.com/a",
      www: "https://www.evil-bank.com/b",
      sub: "https://login.evil-bank.com/c",
      conusuario: "https://user:pass@pay.evil-bank.com/d",
      parecido: "https://notevil-bank.com/e",
      engano: "https://evil-bank.com.attacker.net/f",
      ruta: "https://example.com/evil-bank.com",
    };
    for (const [slug, url] of Object.entries(urls)) await createLink({ userId: u.id }, url, `${slug}-x`);

    expect(await blockDomain("evil-bank.com", "admin@cut.test")).toBe(4);
    for (const slug of ["raiz", "www", "sub", "conusuario"]) expect(await disabled(`${slug}-x`)).toBe(true);
    for (const slug of ["parecido", "engano", "ruta"]) expect(await disabled(`${slug}-x`)).toBe(false);
    await expect(createLink({ userId: u.id }, "https://shop.evil-bank.com")).rejects.toMatchObject({ code: "unsafeUrl" });
  });
});

describe("cuentas ilimitadas", () => {
  it("una sola solicitud pendiente; aprobarla da ilimitado y avisa en el idioma del usuario", async () => {
    const u = await createUser();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    setRequest({ cookies: { cut_lang: "pt" } });

    expect(await requestUnlimited(u.id, "campanha grande")).toBe("pending");
    expect(await requestUnlimited(u.id, "otra vez")).toBe("pending");
    await Promise.all(pendingAfter);
    expect(log.mock.calls.some(([t]) => String(t).includes("Solicitud de cuenta ilimitada"))).toBe(true);

    const { supportTicket } = await import("@/db/schema");
    const tickets = await db.select().from(supportTicket);
    expect(tickets).toHaveLength(1);

    await resolveRequest(tickets[0].id, true, "admin@cut.test");
    await Promise.all(pendingAfter);
    expect(await unlimitedStatus(u.id)).toBe("unlimited");
    expect(log.mock.calls.some(([t]) => String(t).includes("Sua conta do cut. agora é ilimitada"))).toBe(true);
  });

  it("quitar lo ilimitado regresa la cuenta al límite", async () => {
    const u = await createUser();
    await setUnlimited(u.id, true, "admin@cut.test");
    for (let i = 0; i < 4; i++) await createLink({ userId: u.id }, `example.com/${i}`);
    await setUnlimited(u.id, false, "admin@cut.test");
    await expect(createLink({ userId: u.id }, "example.com/extra")).rejects.toMatchObject({ code: "userLimit" });
    expect((await db.select({ u: user.unlimited }).from(user).where(eq(user.id, u.id)))[0].u).toBe(false);
  });
});
