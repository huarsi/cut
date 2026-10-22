import { z } from "zod";
import { apiError, withApiKey } from "@/lib/api";
import { createLink, listLinks, serializeLink } from "@/lib/links";
import { SLUG_LENGTH } from "@/lib/slug";

const createSchema = z.object({
  url: z.string().min(1).max(2048),
  slug: z.string().optional().nullable(),
  length: z.number().int().min(SLUG_LENGTH.min).max(SLUG_LENGTH.max).optional(),
});

export const POST = withApiKey(async (request, userId) => {
  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "badBody");

  const created = await createLink({ userId }, body.data.url, body.data.slug, body.data.length);
  return Response.json(serializeLink(created), { status: 201 });
});

export const GET = withApiKey(async (request, userId) => {
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit")) || 50, 1), 500);
  const links = await listLinks(userId, limit);
  return Response.json({ links: links.map(serializeLink) });
});
