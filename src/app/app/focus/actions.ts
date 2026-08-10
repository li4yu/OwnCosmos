"use server";

import { revalidatePath } from "next/cache";
import {
  FOCUS_MODE_COUNTDOWN,
  FOCUS_MODE_FORWARD,
  FOCUS_STATUS_PAUSED,
  FOCUS_STATUS_RUNNING,
} from "@/db/schema";
import { requireSession } from "@/lib/session";
import { createEssay } from "@/services/essays";
import {
  completeFocusSession,
  getFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  startFocusSession,
} from "@/services/focus";

export type FocusActionState = {
  error?: string;
  archiveId?: string;
  essayId?: string;
};

function revalidateFocus(opts?: { archiveId?: string; planId?: string | null }) {
  revalidatePath("/app/focus");
  revalidatePath("/app/focus/forward");
  revalidatePath("/app/focus/countdown");
  revalidatePath("/app/focus/records");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery/focus-record");
  revalidatePath("/app/present/essays");
  if (opts?.archiveId) {
    revalidatePath(`/app/past/gallery/focus-record/${opts.archiveId}`);
  }
  if (opts?.planId) {
    revalidatePath(`/app/future/plans/${opts.planId}`);
    revalidatePath("/app/future/plans");
    revalidatePath("/app/future/cycles");
  }
}

export async function startForwardFocusAction(
  bindKey?: string | null,
): Promise<FocusActionState> {
  const session = await requireSession();
  const result = await startFocusSession(session.user.id, {
    mode: FOCUS_MODE_FORWARD,
    bindKey,
  });
  if (result.error) return { error: result.error };
  revalidateFocus();
  return {};
}

export async function startCountdownFocusAction(
  targetMs: number,
  bindKey?: string | null,
): Promise<FocusActionState> {
  const session = await requireSession();
  const result = await startFocusSession(session.user.id, {
    mode: FOCUS_MODE_COUNTDOWN,
    targetMs,
    bindKey,
  });
  if (result.error) return { error: result.error };
  revalidateFocus();
  return {};
}

export async function pauseFocusAction(
  sessionId: string,
): Promise<FocusActionState> {
  const session = await requireSession();
  const updated = await pauseFocusSession(session.user.id, sessionId);
  if (!updated) return { error: "无法暂停：会话不存在或不在进行中" };
  revalidateFocus();
  return {};
}

export async function resumeFocusAction(
  sessionId: string,
): Promise<FocusActionState> {
  const session = await requireSession();
  const updated = await resumeFocusSession(session.user.id, sessionId);
  if (!updated) return { error: "无法继续：会话不存在或不在暂停中" };
  revalidateFocus();
  return {};
}

export async function completeFocusAction(
  sessionId: string,
  reflection: string,
): Promise<FocusActionState> {
  const session = await requireSession();
  const result = await completeFocusSession(
    session.user.id,
    sessionId,
    reflection,
  );
  if (!result) return { error: "无法结束：会话不存在或已结束" };
  revalidateFocus({ archiveId: result.archiveId, planId: result.planId });
  return { archiveId: result.archiveId };
}

/** 专注中唤起随笔：写入 source_focus_session_id，不结束计时 */
export async function createFocusEssayAction(
  sessionId: string,
  title: string,
  body: string,
): Promise<FocusActionState> {
  const session = await requireSession();
  const focus = await getFocusSession(session.user.id, sessionId);
  if (
    !focus ||
    (focus.status !== FOCUS_STATUS_RUNNING &&
      focus.status !== FOCUS_STATUS_PAUSED)
  ) {
    return { error: "当前没有进行中的凝时会话" };
  }
  const text = body.trim();
  if (!text && !title.trim()) {
    return { error: "请填写标题或正文" };
  }
  const essayId = await createEssay(session.user.id, {
    title: title.trim() || "凝时随记",
    body: text,
    sourceFocusSessionId: sessionId,
  });
  if (!essayId) {
    return { error: "创建随笔失败" };
  }
  revalidatePath("/app/present/essays");
  revalidatePath("/app/present/essays/daily");
  revalidatePath(`/app/present/essays/${essayId}`);
  return { essayId };
}
