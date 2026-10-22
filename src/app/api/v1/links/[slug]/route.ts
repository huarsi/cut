import { apiError, withApiKey } from "@/lib/api";
import { deleteLink, getLink, serializeLink } from "@/lib/links";

type Ctx = RouteContext<"/api/v1/links/[slug]">;

export const GET = withApiKey<Ctx>(async (_request, userId, ctx) => {
  const found = await getLink(userId, (await ctx.params).slug);
  return found ? Response.json(serializeLink(found)) : apiError(404, "notFound");
});

export const DELETE = withApiKey<Ctx>(async (_request, userId, ctx) => {
  const deleted = await deleteLink(userId, (await ctx.params).slug);
  return deleted ? new Response(null, { status: 204 }) : apiError(404, "notFound");
});
