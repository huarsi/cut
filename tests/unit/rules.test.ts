import { describe, expect, it } from "vitest";
import { displayUrl } from "@/lib/format";
import { parseSlug } from "@/lib/reports";
import { isBlockedHost } from "@/lib/safety";
import { ALIAS_PATTERN, parseSlugLength } from "@/lib/slug";

describe("parseSlugLength", () => {
  it("acepta de 3 a 7", () => {
    for (const n of [3, 4, 5, 6, 7]) expect(parseSlugLength(String(n))).toBe(n);
  });
  it.each(["2", "8", "abc", "", null, "5.5"])("cae a 5 con %s", (value) => {
    expect(parseSlugLength(value)).toBe(5);
  });
});

describe("ALIAS_PATTERN", () => {
  it.each(["abc", "mi-promo_2026", "a".repeat(100)])("acepta %s", (alias) => expect(ALIAS_PATTERN.test(alias)).toBe(true));
  it.each(["ab", "con espacio", "punto.no", "a".repeat(101), "ñandú"])("rechaza %s", (alias) =>
    expect(ALIAS_PATTERN.test(alias)).toBe(false),
  );
});

describe("isBlockedHost", () => {
  it("bloquea otros acortadores y sus subdominios", () => {
    expect(isBlockedHost("bit.ly")).toBe(true);
    expect(isBlockedHost("www.tinyurl.com")).toBe(true);
    expect(isBlockedHost("BIT.LY")).toBe(true);
  });
  it("bloquea los dominios de BLOCKED_DOMAINS", () => {
    expect(isBlockedHost("malo.example")).toBe(true);
    expect(isBlockedHost("login.malo.example")).toBe(true);
  });
  it("no bloquea dominios que solo se parecen", () => {
    expect(isBlockedHost("notbit.ly")).toBe(false);
    expect(isBlockedHost("bit.ly.example.com")).toBe(false);
    expect(isBlockedHost("nomalo.example")).toBe(false);
    expect(isBlockedHost("example.com")).toBe(false);
  });
});

describe("parseSlug (formulario de reportes)", () => {
  it.each([
    ["https://cut.lat/abc12", "abc12"],
    ["cut.lat/abc12", "abc12"],
    ["/abc12", "abc12"],
    ["abc12", "abc12"],
    ["https://cut.lat/abc12?utm=x#y", "abc12"],
    ["  https://cut.lat/abc12/  ", "abc12"],
  ])("%s → %s", (input, slug) => expect(parseSlug(input)).toBe(slug));

  it("devuelve null si no hay un slug válido", () => {
    expect(parseSlug("https://cut.lat/")).toBe(null);
    expect(parseSlug("no es un link")).toBe(null);
  });
});

describe("displayUrl", () => {
  it("quita protocolo, www y la / final", () => {
    expect(displayUrl("https://www.example.com/")).toBe("example.com");
    expect(displayUrl("http://example.com/a/b")).toBe("example.com/a/b");
  });
});
