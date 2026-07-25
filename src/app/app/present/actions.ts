"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { createEssay, deleteActiveEssay, updateEssay } from "@/services/essays";
import { archiveActiveEssay } from "@/services/archive";
import { ARCHIVE_REASON_MANUAL } from "@/db/schema";

export type EssayActionState = {
  error?: string;
  /** 新建成功后由客户端跳转编辑页（避免 server redirect 时壳层 dirty 未清） */
  createdId?: string;
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
  return { createdId: id };
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

export async function archiveEssayAction(
  essayId: string,
): Promise<EssayActionState> {
  const session = await requireSession();
  const archiveId = await archiveActiveEssay(
    session.user.id,
    essayId,
    ARCHIVE_REASON_MANUAL,
  );
  if (!archiveId) {
    return { error: "随笔不存在或已归档，无法归档" };
  }
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  revalidatePath(`/app/present/essays/${essayId}`);
  revalidatePath("/app/past");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery/essay-sediment");
  return {};
}
