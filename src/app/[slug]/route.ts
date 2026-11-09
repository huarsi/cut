import { eq, sql } from "drizzle-orm";
import { after, type NextRequest } from "next/server";
import { db } from "@/db";
import { link } from "@/db/schema";
import { isBot } from "@/lib/bots";
import { isBlockedUrl } from "@/lib/safety";
import { ALIAS_PATTERN } from "@/lib/slug";

async function resolve(request: NextRequest, ctx: RouteContext<"/[slug]">, countClick: boolean) {
  const { slug } = await ctx.params;
  // Ningún slug válido tiene otros caracteres: no hace falta preguntar a la base.
  const found = ALIAS_PATTERN.test(slug)
    ? (
        await db
          .select({ id: link.id, url: link.url, disabledAt: link.disabledAt })
          .from(link)
          .where(eq(link.slug, slug))
      )[0]
    : undefined;

  // Un link desactivado por moderación, o hacia un dominio de BLOCKED_DOMAINS, deja de redirigir.
  if (!found || found.disabledAt || isBlockedUrl(found.url)) {
    const reason = found ? "blocked" : "missing";
    return Response.redirect(new URL(`/?${reason}=${encodeURIComponent(slug)}`, request.url), 302);
  }

  // Solo cuentan las visitas de personas, no las de bots ni las vistas previas de los chats.
  // Se cuenta después de responder, para que la redirección no espere a la base.
  if (countClick && !isBot(request.headers)) {
    after(() =>
      db
        .update(link)
        .set({ clicks: sql`${link.clicks} + 1`, lastClickedAt: new Date() })
        .where(eq(link.id, found.id)),
    );
  }

  return new Response(null, {
    status: 302,
    headers: { Location: found.url, "Cache-Control": "no-store" },
  });
}

export const GET = (request: NextRequest, ctx: RouteContext<"/[slug]">) => resolve(request, ctx, true);

// HEAD lo usan revisores de links y monitores: responde igual pero no cuenta clic.
export const HEAD = (request: NextRequest, ctx: RouteContext<"/[slug]">) => resolve(request, ctx, false);
