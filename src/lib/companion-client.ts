/** 伴读桌宠：打卡成功后立刻弹鼓励轻语 */

export const COMPANION_BUBBLE_EVENT = "owncosmos:companion-bubble";

export type CompanionBubbleDetail = {
  id: string;
  category: string;
  label?: string;
  text: string;
  askText: string | null;
};

export async function requestCheckinCheerBubble(title?: string) {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/ai/proactive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkin_cheer",
        title: title?.trim() || undefined,
      }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      bubble?: CompanionBubbleDetail;
    };
    if (!data.ok || !data.bubble) return;
    window.dispatchEvent(
      new CustomEvent(COMPANION_BUBBLE_EVENT, { detail: data.bubble }),
    );
  } catch {
    /* ignore */
  }
}
