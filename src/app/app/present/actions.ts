"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { createEssay, deleteActiveEssay, updateEssay } from "@/services/essays";

export type EssayActionState = {
  error?: string;
};

export async function createEssayAction(
  _prev: EssayActionState,
  formData: FormData,
): Promise<EssayActionState> {
  const session = await requireSession();
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  if (!title.trim() && !body.trim()) {
    return { error: "请至少填写标题或正文" };
  }
  const id = await createEssay(session.user.id, { title, body });
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  redirect(`/app/present/essays/${id}`);
}

export async function updateEssayAction(
  essayId: string,
  _prev: EssayActionState,
  formData: FormData,
): Promise<EssayActionState> {
  const session = await requireSession();
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  if (!title.trim() && !body.trim()) {
    return { error: "请至少填写标题或正文" };
  }
  const updated = await updateEssay(session.user.id, essayId, { title, body });
  if (!updated) {
    return { error: "随笔不存在或已归档" };
  }
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  revalidatePath(`/app/present/essays/${essayId}`);
  return {};
}

export async function deleteEssayAction(
  essayId: string,
): Promise<EssayActionState> {
  const session = await requireSession();
  const ok = await deleteActiveEssay(session.user.id, essayId);
  if (!ok) {
    return { error: "随笔不存在或已归档，无法删除" };
  }
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  revalidatePath(`/app/present/essays/${essayId}`);
  return {};
}
