import { z } from "zod";
import { apiError, withApiKey } from "@/lib/api";
import { createLink, listLinks, serializeLink } from "@/lib/links";

const createSchema = z.object({
  url: z.string().min(1).max(2048),
  slug: z.string().optional().nullable(),
});

export const POST = withApiKey(async (request, userId) => {
  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, 'El cuerpo debe ser JSON: { "url": "https://…", "slug"?: "alias" }');

  const created = await createLink(userId, body.data.url, body.data.slug);
  return Response.json(serializeLink(created), { status: 201 });
});

export const GET = withApiKey(async (request, userId) => {
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 50, 1), 500);
  const links = await listLinks(userId, limit);
  return Response.json({ links: links.map(serializeLink) });
});
