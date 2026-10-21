"use server";

import { revalidatePath } from "next/cache";
import { createApiKey, revokeApiKey } from "@/lib/api-keys";
import { requireUser } from "@/lib/auth";
import { createLink, deleteLink, LinkError, shortUrl } from "@/lib/links";

export type CreateLinkState =
  | { ok: true; url: string; shortUrl: string; at: number }
  | { ok: false; error: string }
  | null;

export async function createLinkAction(_prev: CreateLinkState, form: FormData): Promise<CreateLinkState> {
  const user = await requireUser();
  try {
    const created = await createLink(user.id, String(form.get("url") ?? ""), String(form.get("slug") ?? ""));
    revalidatePath("/dashboard");
    // `at` hace que la animación se repita aunque se acorte el mismo link dos veces.
    return { ok: true, url: created.url, shortUrl: shortUrl(created.slug), at: Date.now() };
  } catch (error) {
    if (error instanceof LinkError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function deleteLinkAction(slug: string) {
  const user = await requireUser();
  await deleteLink(user.id, slug);
  revalidatePath("/dashboard");
}

export async function createKeyAction(_prev: string | null, form: FormData) {
  const user = await requireUser("/dashboard/keys");
  const key = await createApiKey(user.id, String(form.get("name") ?? ""));
  revalidatePath("/dashboard/keys");
  return key;
}

export async function revokeKeyAction(id: string) {
  const user = await requireUser("/dashboard/keys");
  await revokeApiKey(user.id, id);
  revalidatePath("/dashboard/keys");
}
