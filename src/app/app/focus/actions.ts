"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  completeFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  startForwardFocus,
} from "@/services/focus";

export type FocusActionState = {
  error?: string;
  archiveId?: string;
};

function revalidateFocus(archiveId?: string) {
  revalidatePath("/app/focus");
  revalidatePath("/app/focus/forward");
  revalidatePath("/app/focus/records");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery/focus-record");
  if (archiveId) {
    revalidatePath(`/app/past/gallery/focus-record/${archiveId}`);
  }
}

export async function startForwardFocusAction(): Promise<FocusActionState> {
  const session = await requireSession();
  await startForwardFocus(session.user.id);
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
  revalidateFocus(result.archiveId);
  return { archiveId: result.archiveId };
}
