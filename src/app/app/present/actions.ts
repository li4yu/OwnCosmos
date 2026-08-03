"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { localTodayNoon } from "@/lib/plan-dates";
import { createEssay, deleteActiveEssay, updateEssay } from "@/services/essays";
import { archiveActiveEssay } from "@/services/archive";
import { refineEssayToPlan } from "@/services/plans";
import { setEssayTags } from "@/services/tags";
import { searchArchivesForBorrow } from "@/services/search";
import { ARCHIVE_REASON_MANUAL } from "@/db/schema";

export type EssayActionState = {
  error?: string;
  /** 新建成功后由客户端跳转编辑页（避免 server redirect 时壳层 dirty 未清） */
  createdId?: string;
  /** 提炼成功后跳转计划编辑页 */
  refinedPlanId?: string;
};

function parseTagIds(formData: FormData) {
  return String(formData.get("tagIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createEssayAction(
  _prev: EssayActionState,
  formData: FormData,
): Promise<EssayActionState> {
  const session = await requireSession();
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const mood = String(formData.get("mood") ?? "");
  const folderRaw = String(formData.get("folderId") ?? "").trim();
  const folderId = folderRaw || null;
  if (!title.trim() && !body.trim()) {
    return { error: "请至少填写标题或正文" };
  }
  const id = await createEssay(session.user.id, {
    title,
    body,
    mood,
    folderId,
  });
  if (!id) {
    return { error: folderId ? "专题不存在" : "创建失败" };
  }
  const tagResult = await setEssayTags(
    session.user.id,
    id,
    parseTagIds(formData),
  );
  if ("error" in tagResult) return { error: tagResult.error };
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  revalidatePath("/app/present/essays/daily");
  if (folderId) {
    revalidatePath("/app/present/essays/topics");
    revalidatePath(`/app/present/essays/topics/${folderId}`);
  }
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
  const mood = String(formData.get("mood") ?? "");
  if (!title.trim() && !body.trim()) {
    return { error: "请至少填写标题或正文" };
  }
  const updated = await updateEssay(session.user.id, essayId, {
    title,
    body,
    mood,
  });
  if (!updated) {
    return { error: "随笔不存在或已归档" };
  }
  const tagResult = await setEssayTags(
    session.user.id,
    essayId,
    parseTagIds(formData),
  );
  if ("error" in tagResult) return { error: tagResult.error };
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  revalidatePath("/app/present/essays/daily");
  revalidatePath("/app/present/essays/topics");
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
  revalidatePath("/app/present/essays/daily");
  revalidatePath("/app/present/essays/topics");
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
    return { error: "随笔不存在、已归档，或属于专题（请整专题归档）" };
  }
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  revalidatePath("/app/present/essays/daily");
  revalidatePath("/app/present/essays/topics");
  revalidatePath(`/app/present/essays/${essayId}`);
  revalidatePath("/app/past");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery/essay-sediment");
  return {};
}

/** 流思笺提炼 → 来日途单次计划（预填标题正文，截止默认今天） */
export async function refineEssayAction(
  essayId: string,
): Promise<EssayActionState> {
  const session = await requireSession();
  const planId = await refineEssayToPlan(
    session.user.id,
    essayId,
    localTodayNoon(),
  );
  if (!planId) {
    return { error: "随笔不存在或已归档，无法提炼" };
  }
  revalidatePath("/app/present");
  revalidatePath("/app/present/essays");
  revalidatePath("/app/future");
  revalidatePath("/app/future/plans");
  return { refinedPlanId: planId };
}

export async function searchArchivesForBorrowAction(q: string) {
  const session = await requireSession();
  if (!q.trim()) return { error: "请输入关键词" };
  const hits = await searchArchivesForBorrow(session.user.id, q);
  return {
    hits: hits.map((h) => ({
      id: h.id,
      title: h.title,
      body: h.body,
    })),
  };
}
