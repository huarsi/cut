"use server";

import { revalidatePath } from "next/cache";
import { claimAnonLinks, currentAnonId } from "@/lib/anon";
import { createApiKey, revokeApiKey } from "@/lib/api-keys";
import { requireUser } from "@/lib/auth";
import { getT } from "@/i18n/server";
import {
  createLink,
  deleteLink,
  LinkError,
  toCreateLinkState,
  updateLinkUrl,
  type CreateLinkState,
} from "@/lib/links";
import { parseSlugLength } from "@/lib/slug";
import { requestUnlimited } from "@/lib/support";

export async function createLinkAction(_prev: CreateLinkState, form: FormData): Promise<CreateLinkState> {
  const user = await requireUser();
  return toCreateLinkState(async () => {
    const created = await createLink(
      { userId: user.id },
      String(form.get("url") ?? ""),
      String(form.get("slug") ?? ""),
      parseSlugLength(form.get("length")),
    );
    revalidatePath("/dashboard");
    return created;
  });
}

export async function claimAnonLinksAction() {
  const user = await requireUser();
  const anonId = await currentAnonId();
  if (anonId) await claimAnonLinks(anonId, user.id);
  revalidatePath("/dashboard");
}

export type UpdateLinkResult = { ok: true; url: string } | { ok: false; error: string };

export async function updateLinkAction(slug: string, url: string): Promise<UpdateLinkResult> {
  const user = await requireUser();
  try {
    const updated = await updateLinkUrl(user.id, slug, url);
    revalidatePath("/dashboard");
    return { ok: true, url: updated.url };
  } catch (error) {
    if (error instanceof LinkError) return { ok: false, error: (await getT()).errors[error.code] };
    throw error;
  }
}

export async function deleteLinkAction(slug: string) {
  const user = await requireUser();
  await deleteLink(user.id, slug);
  revalidatePath("/dashboard");
}

export async function requestUnlimitedAction(message: string) {
  const user = await requireUser("/dashboard/settings");
  const status = await requestUnlimited(user.id, String(message ?? ""));
  revalidatePath("/dashboard/settings");
  return status;
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
