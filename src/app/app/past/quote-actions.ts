"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { getArchiveItem } from "@/services/archive";
import { createEssay } from "@/services/essays";
import { createPlan } from "@/services/plans";
import { localTodayNoon } from "@/lib/plan-dates";
import { PLAN_KIND_ONCE } from "@/db/schema";

/** 引用新建：复制馆藏为新随笔（不改原文） */
export async function quoteArchiveAsEssayAction(archiveItemId: string) {
  const session = await requireSession();
  const item = await getArchiveItem(session.user.id, archiveItemId);
  if (!item) return { error: "馆藏不存在" };
  const id = await createEssay(session.user.id, {
    title: item.title,
    body: item.body,
    mood: item.mood,
  });
  revalidatePath("/app/present/essays");
  return { essayId: id };
}

/** 引用新建：复制馆藏为新单次计划 */
export async function quoteArchiveAsPlanAction(archiveItemId: string) {
  const session = await requireSession();
  const item = await getArchiveItem(session.user.id, archiveItemId);
  if (!item) return { error: "馆藏不存在" };
  const id = await createPlan(session.user.id, {
    title: item.title,
    body: item.body,
    dueAt: localTodayNoon(),
    kind: PLAN_KIND_ONCE,
    mood: item.mood,
  });
  revalidatePath("/app/future/plans");
  return { planId: id };
}
