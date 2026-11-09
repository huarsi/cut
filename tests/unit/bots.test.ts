import { describe, expect, it } from "vitest";
import { isBot } from "@/lib/bots";

const ua = (userAgent: string, extra: Record<string, string> = {}) => new Headers({ "user-agent": userAgent, ...extra });

describe("isBot: qué visitas cuentan como clic", () => {
  it.each([
    ["Chrome en Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"],
    ["Safari en iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"],
    ["navegador de Instagram", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0"],
    ["Firefox en Android", "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0"],
  ])("cuenta a una persona: %s", (_, userAgent) => {
    expect(isBot(ua(userAgent))).toBe(false);
  });

  it.each([
    ["vista previa de WhatsApp", "WhatsApp/2.23.20.0 A"],
    ["vista previa de iMessage", "Mozilla/5.0 (Macintosh) facebookexternalhit/1.1 Facebot Twitterbot/1.0"],
    ["Slack", "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)"],
    ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["curl", "curl/8.7.1"],
    ["un script de Python", "python-requests/2.32.3"],
    ["Chrome sin interfaz", "Mozilla/5.0 HeadlessChrome/130.0"],
  ])("no cuenta: %s", (_, userAgent) => {
    expect(isBot(ua(userAgent))).toBe(true);
  });

  it("no cuenta una visita sin user-agent", () => {
    expect(isBot(new Headers())).toBe(true);
  });

  it("no cuenta una carga anticipada (prefetch) del navegador", () => {
    expect(isBot(ua("Mozilla/5.0 Chrome/130.0 Safari/537.36", { "sec-purpose": "prefetch;prerender" }))).toBe(true);
  });
});
