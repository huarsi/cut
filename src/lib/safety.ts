// Filtros contra links de phishing o malware. Un acortador abierto atrae spam, y si el
// dominio cae en listas negras (Google Safe Browsing, filtros de correo) se rompen todos los links.

import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { blockedDomain } from "@/db/schema";

// Otros acortadores: se usan para esconder el destino real encadenando redirecciones.
const SHORTENERS = [
  "bit.ly", "bitly.com", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "v.gd", "buff.ly",
  "cutt.ly", "rebrand.ly", "shorturl.at", "tiny.cc", "rb.gy", "t.ly", "s.id", "shorte.st",
  "adf.ly", "bl.ink", "lnkd.in", "qrco.de", "short.io", "tr.ee", "x.gd", "urlz.fr",
];

// Dominios extra a bloquear sin tocar código: BLOCKED_DOMAINS=malo.com,otro.net
const fromEnv = (process.env.BLOCKED_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase().replace(/^\*?\./, ""))
  .filter(Boolean);

const BLOCKED = new Set([...SHORTENERS, ...fromEnv]);

/** El host y sus dominios padre: `a.b.com` → `a.b.com`, `b.com`. Bloquear `b.com` cubre sus subdominios. */
function domainsOf(hostname: string) {
  const parts = hostname.toLowerCase().replace(/\.$/, "").split(".");
  return parts.slice(0, -1).map((_, i) => parts.slice(i).join("."));
}

/** Revisa la lista fija y BLOCKED_DOMAINS. Es síncrona para poder usarla en cada redirección. */
export function isBlockedHost(hostname: string) {
  return domainsOf(hostname).some((d) => BLOCKED.has(d));
}

/** Revisa además los dominios bloqueados desde el portal de moderación. */
export async function isBlockedHostAnywhere(hostname: string) {
  if (isBlockedHost(hostname)) return true;
  const domains = domainsOf(hostname);
  if (domains.length === 0) return false;
  const [found] = await db
    .select({ domain: blockedDomain.domain })
    .from(blockedDomain)
    .where(inArray(blockedDomain.domain, domains))
    .limit(1);
  return Boolean(found);
}

export function isBlockedUrl(url: string) {
  try {
    return isBlockedHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

const SAFE_BROWSING_KEY = process.env.GOOGLE_SAFE_BROWSING_KEY;

/**
 * Pregunta a Google Safe Browsing si la URL es de phishing, malware o software no deseado.
 * Sin GOOGLE_SAFE_BROWSING_KEY no revisa nada. Si Google no responde a tiempo, deja pasar
 * el link: es preferible eso a que nadie pueda acortar mientras su API falla.
 */
export async function isFlaggedBySafeBrowsing(url: string) {
  if (!SAFE_BROWSING_KEY) return false;
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2500),
      body: JSON.stringify({
        client: { clientId: "cut", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
    });
    if (!res.ok) {
      console.error(`Safe Browsing respondió ${res.status}`);
      return false;
    }
    const data: { matches?: unknown[] } = await res.json();
    return Boolean(data.matches?.length);
  } catch (error) {
    console.error("Safe Browsing no respondió", error);
    return false;
  }
}
