import { apiError, withApiKey } from "@/lib/api";
import { z } from "zod";
import { deleteLink, getLink, serializeLink, updateLinkUrl } from "@/lib/links";

type Ctx = RouteContext<"/api/v1/links/[slug]">;

export const GET = withApiKey<Ctx>(async (_request, userId, ctx) => {
  const found = await getLink(userId, (await ctx.params).slug);
  return found ? Response.json(serializeLink(found)) : apiError(404, "notFound");
});

const updateSchema = z.object({ url: z.string().min(1) });

/** Cambia el destino del link; el slug y los clics se conservan. */
export const PATCH = withApiKey<Ctx>(async (request, userId, ctx) => {
  const body = updateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "badBody");
  const updated = await updateLinkUrl(userId, (await ctx.params).slug, body.data.url);
  return Response.json(serializeLink(updated));
});

export const DELETE = withApiKey<Ctx>(async (_request, userId, ctx) => {
  const deleted = await deleteLink(userId, (await ctx.params).slug);
  return deleted ? new Response(null, { status: 204 }) : apiError(404, "notFound");
});
