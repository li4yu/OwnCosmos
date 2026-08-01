"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import {
  createMemoryFragment,
  deleteMemoryFragment,
  setArchiveKept,
  setArchiveKeptMany,
  setArchiveMood,
  updateMemoryFragment,
  wipeInflowArchivesByIds,
} from "@/services/archive";

export type PastActionState = {
  error?: string;
  ok?: boolean;
  count?: number;
  createdId?: string;
};

function revalidateGallery(itemId?: string) {
  revalidatePath("/app/past");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/keep");
  revalidatePath("/app/past/gallery/knowledge");
  revalidatePath("/app/past/gallery/memory-fragment");
  revalidatePath("/app/past/wipe");
  if (itemId) revalidatePath(`/app/past/gallery/${itemId}`);
}

export async function keepArchiveAction(
  itemId: string,
  kept: boolean,
): Promise<PastActionState> {
  const session = await requireSession();
  const result = await setArchiveKept(session.user.id, itemId, kept);
  if (!result.ok) return { error: result.error };
  revalidateGallery(itemId);
  return { ok: true };
}

export async function keepArchivesBatchAction(
  itemIds: string[],
  kept: boolean,
): Promise<PastActionState> {
  const session = await requireSession();
  const result = await setArchiveKeptMany(session.user.id, itemIds, kept);
  if (!result.ok) return { error: result.error };
  revalidateGallery();
  return { ok: true, count: result.count };
}

export async function wipeArchivesByIdsAction(
  itemIds: string[],
): Promise<PastActionState> {
  const session = await requireSession();
  const result = await wipeInflowArchivesByIds(session.user.id, itemIds);
  if (!result.ok) return { error: result.error };
  revalidateGallery();
  return { ok: true, count: result.count };
}

export async function createFragmentAction(
  _prev: PastActionState,
  formData: FormData,
): Promise<PastActionState> {
  const session = await requireSession();
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const imageKey = String(formData.get("imageKey") ?? "").trim() || null;
  const id = await createMemoryFragment(session.user.id, {
    title,
    body,
    imageUrl,
    imageKey,
  });
  if (!id) return { error: "请填写标题、文字或上传图片" };
  revalidateGallery(id);
  redirect(`/app/past/gallery/${id}?section=memory-fragment`);
}

export async function updateFragmentAction(
  itemId: string,
  _prev: PastActionState,
  formData: FormData,
): Promise<PastActionState> {
  const session = await requireSession();
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const clearImage = String(formData.get("clearImage") ?? "") === "1";
  const rawUrl = String(formData.get("imageUrl") ?? "").trim();
  const rawKey = String(formData.get("imageKey") ?? "").trim();
  const id = await updateMemoryFragment(session.user.id, itemId, {
    title,
    body,
    ...(clearImage
      ? { clearImage: true }
      : rawUrl
        ? { imageUrl: rawUrl, imageKey: rawKey || null }
        : {}),
  });
  if (!id) return { error: "无法更新：请保留标题、文字或图片" };
  revalidateGallery(itemId);
  redirect(`/app/past/gallery/${itemId}?section=memory-fragment`);
}

export async function deleteFragmentAction(
  itemId: string,
): Promise<PastActionState> {
  const session = await requireSession();
  const ok = await deleteMemoryFragment(session.user.id, itemId);
  if (!ok) return { error: "无法删除该记忆碎片" };
  revalidateGallery();
  return { ok: true };
}

/** Phase 15: 馆藏补改绪印 */
export async function setArchiveMoodAction(
  itemId: string,
  mood: string | null,
): Promise<PastActionState> {
  const session = await requireSession();
  const result = await setArchiveMood(session.user.id, itemId, mood);
  if (!result.ok) return { error: result.error };
  revalidateGallery(itemId);
  revalidatePath("/app/past/mood");
  revalidatePath("/app/past/corridor");
  return { ok: true };
}
