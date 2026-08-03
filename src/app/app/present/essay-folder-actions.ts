"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  createEssayFolder,
  deleteEssayFolder,
} from "@/services/essay-folders";
import { archiveEssayFolder } from "@/services/archive";

export async function createEssayFolderAction(name: string) {
  const session = await requireSession();
  const result = await createEssayFolder(session.user.id, { name });
  if ("error" in result) return { error: result.error };
  revalidatePath("/app/present/essays");
  revalidatePath("/app/present/essays/topics");
  return { id: result.id };
}

export async function archiveEssayFolderAction(folderId: string) {
  const session = await requireSession();
  const result = await archiveEssayFolder(session.user.id, folderId);
  if ("error" in result) return { error: result.error };
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  revalidatePath("/app/present/essays/topics");
  revalidatePath(`/app/present/essays/topics/${folderId}`);
  revalidatePath("/app/past");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery/essay-sediment");
  revalidatePath("/app/past/gallery/essay-topic");
  return { ok: true as const, count: result.count, name: result.name };
}

export async function deleteEssayFolderAction(folderId: string) {
  const session = await requireSession();
  const result = await deleteEssayFolder(session.user.id, folderId);
  if ("error" in result) return { error: result.error };
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  revalidatePath("/app/present/essays/topics");
  revalidatePath(`/app/present/essays/topics/${folderId}`);
  return { ok: true as const };
}
