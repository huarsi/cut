import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { blockedDomain, link, user } from "@/db/schema";
import { createLink, deleteLink, linkStats, updateLinkUrl, type LinkErrorCode } from "@/lib/links";
import { createUser, resetDb } from "./helpers";

beforeEach(resetDb);

/** Espera que la promesa falle con ese código de error de cut. */
async function expectCode(promise: Promise<unknown>, code: LinkErrorCode) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("crear links", () => {
  it("normaliza la URL y genera un código del largo pedido", async () => {
    const u = await createUser();
    const created = await createLink({ userId: u.id }, "  example.com/ruta ", null, 4);
    expect(created.url).toBe("https://example.com/ruta");
    expect(created.slug).toMatch(/^[a-zA-Z2-9]{4}$/);
  });

  it.each([
    ["no es una url", "invalidUrl"],
    ["ftp://example.com/archivo", "onlyHttp"],
    ["https://cut.test/abc", "alreadyCut"],
    ["https://bit.ly/abc", "unsafeUrl"],
    ["https://sub.malo.example/x", "unsafeUrl"],
    [`https://example.com/${"a".repeat(2100)}`, "urlTooLong"],
  ] as const)("rechaza %s", async (url, code) => {
    const u = await createUser();
    await expectCode(createLink({ userId: u.id }, url), code);
  });

  it("rechaza dominios bloqueados desde el portal, con sus subdominios", async () => {
    const u = await createUser();
    await db.insert(blockedDomain).values({ domain: "phish.example" });
    await expectCode(createLink({ userId: u.id }, "https://pay.phish.example/x"), "unsafeUrl");
    await expect(createLink({ userId: u.id }, "https://nophish.example/x")).resolves.toBeTruthy();
  });

  it("valida el alias: formato, reservado y ocupado", async () => {
    const u = await createUser();
    await expectCode(createLink({ userId: u.id }, "example.com", "a b"), "slugFormat");
    await expectCode(createLink({ userId: u.id }, "example.com", "Dashboard"), "slugReserved");
    await createLink({ userId: u.id }, "example.com", "promo");
    await expectCode(createLink({ userId: u.id }, "example.org", "promo"), "slugTaken");
  });
});

describe("límite por cuenta (3 por hora y 5 por día en pruebas)", () => {
  it("corta al pasar el límite por hora", async () => {
    const u = await createUser();
    for (let i = 0; i < 3; i++) await createLink({ userId: u.id }, `example.com/${i}`);
    await expectCode(createLink({ userId: u.id }, "example.com/extra"), "userLimit");
  });

  it("también cuenta el límite de 24 horas", async () => {
    const u = await createUser();
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
    for (let i = 0; i < 5; i++) {
      await db.insert(link).values({ id: `old${i}`, slug: `old${i}x`, url: "https://example.com", userId: u.id, createdAt: twoHoursAgo });
    }
    await expectCode(createLink({ userId: u.id }, "example.com/extra"), "userLimit");
  });

  it("no limita a las cuentas ilimitadas", async () => {
    const u = await createUser({ unlimited: true });
    for (let i = 0; i < 6; i++) await createLink({ userId: u.id }, `example.com/${i}`);
    expect((await linkStats(u.id)).links).toBe(6);
  });

  it("el límite de una cuenta no afecta a otra", async () => {
    const a = await createUser();
    const b = await createUser();
    for (let i = 0; i < 3; i++) await createLink({ userId: a.id }, `example.com/${i}`);
    await expect(createLink({ userId: b.id }, "example.com")).resolves.toBeTruthy();
  });
});

describe("editar y borrar", () => {
  it("cambia el destino y conserva slug y clics", async () => {
    const u = await createUser();
    const created = await createLink({ userId: u.id }, "example.com/a", "mio");
    await db.update(link).set({ clicks: 7 }).where(eq(link.id, created.id));
    const updated = await updateLinkUrl(u.id, "mio", "example.org/b");
    expect(updated).toMatchObject({ slug: "mio", url: "https://example.org/b", clicks: 7 });
  });

  it("nadie puede editar ni borrar links ajenos", async () => {
    const owner = await createUser();
    const other = await createUser();
    await createLink({ userId: owner.id }, "example.com", "ajeno");
    await expectCode(updateLinkUrl(other.id, "ajeno", "example.org"), "notFound");
    expect(await deleteLink(other.id, "ajeno")).toBe(false);
    expect(await deleteLink(owner.id, "ajeno")).toBe(true);
  });

  it("borrar la cuenta borra sus links", async () => {
    const u = await createUser();
    await createLink({ userId: u.id }, "example.com", "sebora");
    await db.delete(user).where(eq(user.id, u.id));
    expect(await db.select().from(link).where(eq(link.slug, "sebora"))).toHaveLength(0);
  });
});

it("linkStats suma todos los links, no solo una página", async () => {
  const u = await createUser({ unlimited: true });
  for (let i = 0; i < 60; i++) {
    await db.insert(link).values({ id: `s${i}`, slug: `stat${i}`, url: "https://example.com", userId: u.id, clicks: 2 });
  }
  expect(await linkStats(u.id)).toEqual({ links: 60, clicks: 120 });
});
