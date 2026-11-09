import { beforeEach, vi } from "vitest";

// Next.js no corre en las pruebas: se simulan las funciones que dependen de la petición.

/** Cookies y headers de la "petición" actual. Cada prueba los ajusta con `setRequest`. */
export const request = { cookies: new Map<string, string>(), headers: new Headers() };

export function setRequest({ ip = "203.0.113.1", cookies = {} }: { ip?: string; cookies?: Record<string, string> } = {}) {
  request.cookies = new Map(Object.entries(cookies));
  request.headers = new Headers({ "x-forwarded-for": ip });
}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (request.cookies.has(name) ? { name, value: request.cookies.get(name)! } : undefined),
    set: (name: string, value: string) => void request.cookies.set(name, value),
  }),
  headers: async () => request.headers,
}));

// `after()` corre el trabajo después de responder; en pruebas se espera aquí mismo.
export const pendingAfter: Promise<unknown>[] = [];
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => void pendingAfter.push(Promise.resolve().then(task)),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

beforeEach(() => {
  setRequest();
  pendingAfter.length = 0;
});
