"use server";

import { revalidatePath } from "next/cache";
import { ARCHIVE_REASON_PLAN_COMPLETE } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { completeAndArchivePlan } from "@/services/plans";

export type DueActionState = {
  error?: string;
};

export async function completeDuePlanAction(
  planId: string,
): Promise<DueActionState> {
  const session = await requireSession();
  const archiveId = await completeAndArchivePlan(
    session.user.id,
    planId,
    ARCHIVE_REASON_PLAN_COMPLETE,
  );
  if (!archiveId) {
    return { error: "计划不存在或已归档" };
  }
  revalidatePath("/app/present");
  revalidatePath("/app/present/due");
  revalidatePath("/app/future");
  revalidatePath("/app/future/plans");
  revalidatePath(`/app/future/plans/${planId}`);
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery/plan-archive");
  return {};
}
