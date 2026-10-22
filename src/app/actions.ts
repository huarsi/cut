"use server";

import { revalidatePath } from "next/cache";
import { createAnonLink } from "@/lib/anon";
import { toCreateLinkState, type CreateLinkState } from "@/lib/links";

export async function createAnonLinkAction(_prev: CreateLinkState, form: FormData): Promise<CreateLinkState> {
  return toCreateLinkState(async () => {
    const created = await createAnonLink(String(form.get("url") ?? ""));
    revalidatePath("/");
    return created;
  });
}
