import { eq, sql } from "drizzle-orm";
import { after, type NextRequest } from "next/server";
import { db } from "@/db";
import { link } from "@/db/schema";

export async function GET(request: NextRequest, ctx: RouteContext<"/[slug]">) {
  const { slug } = await ctx.params;
  const [found] = await db
    .select({ id: link.id, url: link.url })
    .from(link)
    .where(eq(link.slug, slug));

  if (!found) {
    return Response.redirect(new URL(`/?missing=${encodeURIComponent(slug)}`, request.url), 302);
  }

  // Contamos el clic después de responder, para que la redirección no espere a la BD.
  after(() =>
    db
      .update(link)
      .set({ clicks: sql`${link.clicks} + 1`, lastClickedAt: new Date() })
      .where(eq(link.id, found.id)),
  );

  return new Response(null, {
    status: 302,
    headers: { Location: found.url, "Cache-Control": "no-store" },
  });
}
