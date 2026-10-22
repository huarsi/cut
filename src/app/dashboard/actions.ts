"use server";

import { revalidatePath } from "next/cache";
import { claimAnonLinks, currentAnonId } from "@/lib/anon";
import { createApiKey, revokeApiKey } from "@/lib/api-keys";
import { requireUser } from "@/lib/auth";
import { createLink, deleteLink, toCreateLinkState, type CreateLinkState } from "@/lib/links";

export async function createLinkAction(_prev: CreateLinkState, form: FormData): Promise<CreateLinkState> {
  const user = await requireUser();
  return toCreateLinkState(async () => {
    const created = await createLink({ userId: user.id }, String(form.get("url") ?? ""), String(form.get("slug") ?? ""));
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
