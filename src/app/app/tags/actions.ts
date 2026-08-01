"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { deactivateTag, ensureTag } from "@/services/tags";

export async function createTagAction(name: string) {
  const session = await requireSession();
  const result = await ensureTag(session.user.id, name);
  if ("error" in result) return { error: result.error };
  revalidatePath("/app");
  return { tagId: result.tag.id, name: result.tag.name };
}

export async function deactivateTagAction(tagId: string) {
  const session = await requireSession();
  const ok = await deactivateTag(session.user.id, tagId);
  if (!ok) return { error: "绪签不存在" };
  revalidatePath("/app");
  return {};
}
