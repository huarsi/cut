// Detecta visitas que no son de una persona: buscadores, vistas previas de chats y redes
// (WhatsApp, Slack, iMessage, Telegram…), monitores y scripts. No es perfecto, pero quita
// la mayor parte del ruido del conteo de clics.
const BOT_PATTERN = new RegExp(
  [
    "bot", "crawl", "spider", "slurp", "preview", "fetch", "scan", "monitor", "uptime", "check",
    "facebookexternalhit", "facebookcatalog", "meta-externalagent", "whatsapp", "slack-imgproxy",
    "vkshare", "embedly", "quora link", "outbrain",
    "headless", "lighthouse", "pagespeed", "phantomjs", "puppeteer", "playwright", "selenium",
    "curl", "wget", "httpie", "python", "go-http", "java/", "okhttp", "axios", "node-fetch",
    "undici", "libwww", "httpclient", "postman", "insomnia",
  ]
    .map((s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"))
    .join("|"),
  "i",
);

export function isBot(headers: Headers) {
  const ua = headers.get("user-agent");
  if (!ua) return true;
  // Navegadores que cargan la página por adelantado, antes de que la persona haga clic.
  const purpose = headers.get("sec-purpose") ?? headers.get("purpose") ?? "";
  if (/prefetch|prerender/i.test(purpose)) return true;
  return BOT_PATTERN.test(ua);
}
