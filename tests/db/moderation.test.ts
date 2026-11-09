import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { link, report, user } from "@/db/schema";
import { createLink } from "@/lib/links";
import { blockDomain, createReport, disableLink, dismissReports, listReportGroups } from "@/lib/reports";
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
