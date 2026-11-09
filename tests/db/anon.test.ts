import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { link } from "@/db/schema";
import { claimAnonLinks, countAnonLinks, createAnonLink, currentAnonId } from "@/lib/anon";
import { createLink } from "@/lib/links";
import { setRequest } from "../setup";
import { createUser, resetDb } from "./helpers";

beforeEach(resetDb);

describe("links sin cuenta", () => {
  it("se ligan a la cookie del navegador y se pueden reclamar", async () => {
    await createAnonLink("example.com/1", 5);
    await createAnonLink("example.com/2", 5);
    const anonId = (await currentAnonId())!;
    expect(await countAnonLinks(anonId)).toBe(2);

    const u = await createUser();
    expect(await claimAnonLinks(anonId, u.id)).toBe(2);
    expect(await countAnonLinks(anonId)).toBe(0);
  });

  it("reclamar nunca toma links que ya tienen dueño", async () => {
    await createAnonLink("example.com/1", 5);
    const anonId = (await currentAnonId())!;
    const first = await createUser();
    await claimAnonLinks(anonId, first.id);

    // Otro usuario en el mismo navegador no se lleva los links de la primera cuenta.
    const second = await createUser();
    expect(await claimAnonLinks(anonId, second.id)).toBe(0);
    const owned = await db.select().from(link).where(eq(link.userId, first.id));
    expect(owned).toHaveLength(1);
  });

  it("limita a 15 links por hora por IP, aunque cambie la cookie", async () => {
    for (let i = 0; i < 15; i++) {
      setRequest({ ip: "198.51.100.9" }); // navegador nuevo cada vez: sin cookie
      await createAnonLink(`example.com/${i}`, 5);
    }
    setRequest({ ip: "198.51.100.9" });
    await expect(createAnonLink("example.com/extra", 5)).rejects.toMatchObject({ code: "anonLimit" });
    setRequest({ ip: "198.51.100.10" });
    await expect(createAnonLink("example.com/otra-ip", 5)).resolves.toBeTruthy();
  });

  it("no comparte límite con los links de cuentas", async () => {
    const u = await createUser({ unlimited: true });
    for (let i = 0; i < 20; i++) await createLink({ userId: u.id }, `example.com/${i}`);
    await expect(createAnonLink("example.com/anon", 5)).resolves.toBeTruthy();
  });
});
