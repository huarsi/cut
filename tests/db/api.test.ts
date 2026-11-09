import { beforeEach, describe, expect, it } from "vitest";
import { POST as createRoute, GET as listRoute } from "@/app/api/v1/links/route";
import { DELETE as deleteRoute, GET as getRoute, PATCH as patchRoute } from "@/app/api/v1/links/[slug]/route";
import { createApiKey } from "@/lib/api-keys";
import { createUser, resetDb } from "./helpers";

beforeEach(resetDb);

const B = "https://cut.test/api/v1/links";
const call = (key: string | null, method: string, path = "", body?: unknown) =>
  new Request(`${B}${path}`, {
    method,
    headers: { ...(key && { Authorization: `Bearer ${key}` }), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("API /api/v1/links", () => {
  it("pide una llave válida", async () => {
    const res = await listRoute(call(null, "GET"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(401);
    const res2 = await listRoute(call("cut_inventada", "GET"), { params: Promise.resolve({}) } as never);
    expect(res2.status).toBe(401);
  });

  it("crea, consulta, cambia el destino y borra", async () => {
    const u = await createUser();
    const key = await createApiKey(u.id, "pruebas");

    const created = await createRoute(call(key, "POST", "", { url: "example.com", slug: "api-1" }), {} as never);
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ slug: "api-1", url: "https://example.com/", disabled: false });

    const patched = await patchRoute(call(key, "PATCH", "/api-1", { url: "example.org" }), ctx("api-1") as never);
    expect((await patched.json()).url).toBe("https://example.org/");

    const got = await getRoute(call(key, "GET", "/api-1"), ctx("api-1") as never);
    expect(got.status).toBe(200);

    const removed = await deleteRoute(call(key, "DELETE", "/api-1"), ctx("api-1") as never);
    expect(removed.status).toBe(204);
    const gone = await getRoute(call(key, "GET", "/api-1"), ctx("api-1") as never);
    expect(gone.status).toBe(404);
  });

  it("una llave no puede tocar links de otra cuenta", async () => {
    const owner = await createUser();
    const other = await createUser();
    const ownerKey = await createApiKey(owner.id, "a");
    const otherKey = await createApiKey(other.id, "b");
    await createRoute(call(ownerKey, "POST", "", { url: "example.com", slug: "privado" }), {} as never);

    expect((await getRoute(call(otherKey, "GET", "/privado"), ctx("privado") as never)).status).toBe(404);
    expect((await patchRoute(call(otherKey, "PATCH", "/privado", { url: "x.com" }), ctx("privado") as never)).status).toBe(404);
    expect((await deleteRoute(call(otherKey, "DELETE", "/privado"), ctx("privado") as never)).status).toBe(404);
  });

  it("responde 400 con cuerpo inválido y 429 al llegar al límite de la cuenta", async () => {
    const u = await createUser();
    const key = await createApiKey(u.id, "pruebas");
    const bad = await createRoute(call(key, "POST", "", { nada: true }), {} as never);
    expect(bad.status).toBe(400);
    expect((await bad.json()).code).toBe("badBody");

    for (let i = 0; i < 3; i++) await createRoute(call(key, "POST", "", { url: `example.com/${i}` }), {} as never);
    const limited = await createRoute(call(key, "POST", "", { url: "example.com/extra" }), {} as never);
    expect(limited.status).toBe(429);
    expect((await limited.json()).code).toBe("userLimit");
  });
});
