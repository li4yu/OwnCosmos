import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { isRagInfraReady } from "@/ai/config";
import { getDb } from "@/db";
import {
  AI_PROACTIVE_CHAT_INVITE,
  AI_PROACTIVE_CHECKIN_CHEER,
  AI_PROACTIVE_CHECKIN_NUDGE,
  AI_PROACTIVE_DUE_HINT,
  AI_PROACTIVE_FOCUS_NUDGE,
  AI_PROACTIVE_MOOD_HINT,
  AI_PROACTIVE_TIP,
  AI_PROACTIVE_TIP_EXTRA,
  AI_PROACTIVE_WELCOME,
  DEFAULT_COMPANION_NAME,
  DEFAULT_COMPANION_TONE,
  DEFAULT_DAILY_BUBBLE_CAP,
  DEFAULT_USER_ADDRESS,
  aiCompanionPref,
  aiProactiveEvent,
  archiveItem,
  type CompanionTone,
} from "@/db/schema";
import {
  clampCompanionName,
  clampUserAddress,
  normalizeTone,
} from "@/lib/companion-persona";
import { moodDisplay, parseMoodKey, type MoodKey } from "@/lib/moods";
import { getFocusShortStats } from "@/services/focus";
import { getHomeSummary } from "@/services/home-summary";
import { listDueReminderPlans } from "@/services/plans";

function newId() {
  return randomBytes(16).toString("hex");
}

function localDayString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function minutesOfDay(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

function inQuietWindow(
  start: number | null | undefined,
  end: number | null | undefined,
  nowMin: number,
) {
  if (start == null || end == null) return false;
  if (start === end) return false;
  if (start < end) return nowMin >= start && nowMin < end;
  // 跨午夜
  return nowMin >= start || nowMin < end;
}

const TIP_POOL = [
  {
    text: "归档不等于进知识库；想进知识库记得点「进知识库」。",
    ask: "进知识库和归档有什么区别？",
  },
  {
    text: "临期提醒只读提醒，完成仍须你亲自点一下。",
    ask: "临期提醒是什么？怎么用？",
  },
  {
    text: "凝时结束后的专注记录，可以进知识库后给伴读回想。",
    ask: "专注记录怎么进昔时往？",
  },
  {
    text: "随笔写完可沉淀进馆藏；想被伴读想起，还要再点进知识库。",
    ask: "随笔怎么归档？",
  },
  {
    text: "周期计划和每日打卡是「计次」归档：同一条会累加，正文按日期分段。",
    ask: "周期计划和每日打卡归档有什么不同？",
  },
  {
    text: "设置里可以改伴读称呼、语气，以及对你的称呼。",
    ask: "伴读的称呼和语气在哪里改？",
  },
  {
    text: "情绪复盘看的是馆藏里带心情的条目，随手标心情会更有用。",
    ask: "情绪复盘怎么用？",
  },
  {
    text: "馆藏分区可以按类型筛选；「全部」之外还有随笔、规划、打卡等。",
    ask: "馆藏里有哪些分区？",
  },
];

export const PROACTIVE_CATEGORY_LABEL: Record<string, string> = {
  [AI_PROACTIVE_WELCOME]: "问候",
  [AI_PROACTIVE_TIP]: "小贴士",
  [AI_PROACTIVE_TIP_EXTRA]: "小贴士",
  [AI_PROACTIVE_DUE_HINT]: "临期",
  [AI_PROACTIVE_MOOD_HINT]: "心绪",
  [AI_PROACTIVE_FOCUS_NUDGE]: "凝时",
  [AI_PROACTIVE_CHECKIN_NUDGE]: "打卡",
  [AI_PROACTIVE_CHECKIN_CHEER]: "鼓励",
  [AI_PROACTIVE_CHAT_INVITE]: "闲聊",
};

function tipAt(seed: number) {
  return TIP_POOL[((seed % TIP_POOL.length) + TIP_POOL.length) % TIP_POOL.length]!;
}

function moodBubble(mood: MoodKey): { text: string; ask: string } {
  const label = moodDisplay(mood);
  switch (mood) {
    case "tired":
      return {
        text: `最近馆藏里多见「${label}」。要不要歇一口气，或找我随便聊两句？`,
        ask: "有点累，想放松一下，有什么轻量建议？",
      };
    case "anxious":
      return {
        text: `感觉你近况偏「${label}」。可以写两句随笔，或让我陪你理一理。`,
        ask: "有点焦虑，陪我聊两句吧。",
      };
    case "sad":
      return {
        text: `近况里有「${label}」。我在这儿；想说就说，不想说也没关系。`,
        ask: "心情有点低，陪我坐一会儿。",
      };
    case "happy":
      return {
        text: `近况里有「${label}」，挺好。想留一点痕迹的话，写条随笔也好。`,
        ask: "最近开心的事，帮我记一句怎么写随笔？",
      };
    case "focused":
      return {
        text: `近况偏「${label}」。若还想沉一下，可以开一段凝时。`,
        ask: "今天和本周我专注了多久？",
      };
    case "moved":
      return {
        text: `近况有「${label}」。那份触动，适合放进随笔或记忆碎片。`,
        ask: "想把触动记下来，随笔还是记忆碎片？",
      };
    case "calm":
      return {
        text: `近况偏「${label}」。适合慢慢翻翻馆藏，或随便聊两句。`,
        ask: "陪我聊两句吧。",
      };
    default:
      return {
        text: `近况心情多是「${label}」。想复盘的话可以去情绪复盘看看。`,
        ask: "情绪复盘怎么用？",
      };
  }
}

async function latestArchiveMood(
  userId: string,
): Promise<MoodKey | null> {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const rows = await getDb()
    .select({ mood: archiveItem.mood })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        isNotNull(archiveItem.mood),
        gte(archiveItem.archivedAt, since),
      ),
    )
    .orderBy(desc(archiveItem.archivedAt))
    .limit(1);
  const key = rows[0]?.mood;
  if (!key) return null;
  return parseMoodKey(key);
}

export type CompanionPref = {
  dnd: boolean;
  dailyBubbleCap: number;
  quietStartMin: number | null;
  quietEndMin: number | null;
  companionName: string;
  tone: CompanionTone;
  userAddress: string;
  personaReady: boolean;
};

export async function getCompanionPref(userId: string): Promise<CompanionPref> {
  const rows = await getDb()
    .select()
    .from(aiCompanionPref)
    .where(eq(aiCompanionPref.userId, userId))
    .limit(1);
  const row = rows[0];
  return {
    dnd: row?.dnd ?? false,
    dailyBubbleCap: row?.dailyBubbleCap ?? DEFAULT_DAILY_BUBBLE_CAP,
    quietStartMin: row?.quietStartMin ?? null,
    quietEndMin: row?.quietEndMin ?? null,
    companionName: row?.companionName?.trim() || DEFAULT_COMPANION_NAME,
    tone: normalizeTone(row?.tone),
    userAddress: row?.userAddress?.trim() || DEFAULT_USER_ADDRESS,
    personaReady: row?.personaReady ?? false,
  };
}

export async function upsertCompanionPref(
  userId: string,
  patch: Partial<CompanionPref>,
): Promise<CompanionPref> {
  const current = await getCompanionPref(userId);
  const next: CompanionPref = {
    dnd: patch.dnd ?? current.dnd,
    dailyBubbleCap: patch.dailyBubbleCap ?? current.dailyBubbleCap,
    quietStartMin:
      patch.quietStartMin !== undefined
        ? patch.quietStartMin
        : current.quietStartMin,
    quietEndMin:
      patch.quietEndMin !== undefined ? patch.quietEndMin : current.quietEndMin,
    companionName:
      patch.companionName !== undefined
        ? clampCompanionName(patch.companionName)
        : current.companionName,
    tone:
      patch.tone !== undefined ? normalizeTone(patch.tone) : current.tone,
    userAddress:
      patch.userAddress !== undefined
        ? clampUserAddress(patch.userAddress)
        : current.userAddress,
    personaReady: patch.personaReady ?? current.personaReady,
  };
  const now = new Date();
  await getDb()
    .insert(aiCompanionPref)
    .values({
      userId,
      dnd: next.dnd,
      dailyBubbleCap: next.dailyBubbleCap,
      quietStartMin: next.quietStartMin,
      quietEndMin: next.quietEndMin,
      companionName: next.companionName,
      tone: next.tone,
      userAddress: next.userAddress,
      personaReady: next.personaReady,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiCompanionPref.userId,
      set: {
        dnd: next.dnd,
        dailyBubbleCap: next.dailyBubbleCap,
        quietStartMin: next.quietStartMin,
        quietEndMin: next.quietEndMin,
        companionName: next.companionName,
        tone: next.tone,
        userAddress: next.userAddress,
        personaReady: next.personaReady,
        updatedAt: now,
      },
    });
  return next;
}

export type ProactiveBubble = {
  id: string;
  category: string;
  label: string;
  text: string;
  askText: string | null;
  createdAt: string;
};

/** 规则调度：问候 / 临期 / 心绪 / 打卡 / 凝时 / 贴士 / 闲聊；频控与勿扰 */
export async function pickProactiveBubble(
  userId: string,
  displayName?: string | null,
): Promise<ProactiveBubble | null> {
  if (!isRagInfraReady()) return null;

  const pref = await getCompanionPref(userId);
  if (pref.dnd) return null;
  if (inQuietWindow(pref.quietStartMin, pref.quietEndMin, minutesOfDay())) {
    return null;
  }

  const day = localDayString();
  const db = getDb();
  const companion = pref.companionName || DEFAULT_COMPANION_NAME;
  const you =
    pref.userAddress && pref.userAddress !== "你"
      ? pref.userAddress
      : displayName?.trim() || "你";

  const todayCountRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiProactiveEvent)
    .where(
      and(eq(aiProactiveEvent.userId, userId), eq(aiProactiveEvent.day, day)),
    );
  const todayCount = Number(todayCountRows[0]?.n ?? 0);
  if (todayCount >= pref.dailyBubbleCap) return null;

  const existing = await db
    .select()
    .from(aiProactiveEvent)
    .where(
      and(eq(aiProactiveEvent.userId, userId), eq(aiProactiveEvent.day, day)),
    );

  const used = new Set(existing.map((e) => e.category));
  // 已展示未关闭的优先返回（同日）
  const open = existing.find((e) => !e.dismissedAt);
  if (open) {
    const payload = (open.payload ?? {}) as {
      text?: string;
      askText?: string;
      label?: string;
    };
    return {
      id: open.id,
      category: open.category,
      label:
        payload.label ||
        PROACTIVE_CATEGORY_LABEL[open.category] ||
        open.category,
      text: payload.text || "",
      askText: payload.askText ?? null,
      createdAt: open.createdAt.toISOString(),
    };
  }

  type Candidate = {
    category: string;
    text: string;
    askText: string | null;
  };

  const candidates: Candidate[] = [];

  if (!used.has(AI_PROACTIVE_WELCOME)) {
    candidates.push({
      category: AI_PROACTIVE_WELCOME,
      text: `${you}，我是${companion}。点我可以聊用法、过往，或随便说两句。`,
      askText: "今天可以做什么？",
    });
  }

  if (candidates.length === 0 && !used.has(AI_PROACTIVE_DUE_HINT)) {
    const due = await listDueReminderPlans(userId);
    if (due.length > 0) {
      const top = due[0]!;
      candidates.push({
        category: AI_PROACTIVE_DUE_HINT,
        text: `临期还有 ${due.length} 件，最近是「${top.title.slice(0, 12)}」。`,
        askText: "今天临期有哪些？先处理哪件？",
      });
    }
  }

  if (candidates.length === 0 && !used.has(AI_PROACTIVE_CHECKIN_NUDGE)) {
    const home = await getHomeSummary(userId);
    const pendingItems = home.checkinItems.filter((c) => !c.checkedIn);
    if (pendingItems.length > 0) {
      const undone = pendingItems[0]!;
      candidates.push({
        category: AI_PROACTIVE_CHECKIN_NUDGE,
        text: `今日打卡还差 ${pendingItems.length} 项，比如「${undone.title.slice(0, 10)}」。`,
        askText: "今天还有哪些打卡没做？",
      });
    }
  }

  if (candidates.length === 0 && !used.has(AI_PROACTIVE_MOOD_HINT)) {
    const mood = await latestArchiveMood(userId);
    // 有近 14 日心情再发；疲惫/焦虑/低落优先，其它心情约一半概率（用日期种子稳定）
    if (mood) {
      const daySeed = Number(day.replace(/-/g, "")) + userId.length;
      const soft =
        mood === "tired" || mood === "anxious" || mood === "sad"
          ? true
          : daySeed % 2 === 0;
      if (soft) {
        const m = moodBubble(mood);
        candidates.push({
          category: AI_PROACTIVE_MOOD_HINT,
          text: m.text,
          askText: m.ask,
        });
      }
    }
  }

  if (
    candidates.length === 0 &&
    !used.has(AI_PROACTIVE_FOCUS_NUDGE) &&
    new Date().getHours() >= 11
  ) {
    const stats = await getFocusShortStats(userId);
    if (stats.todayMs === 0) {
      candidates.push({
        category: AI_PROACTIVE_FOCUS_NUDGE,
        text: "今天还没有专注记录。想沉一会儿的话，可以开一段凝时。",
        askText: "今天和本周我专注了多久？",
      });
    }
  }

  if (candidates.length === 0 && !used.has(AI_PROACTIVE_TIP)) {
    const tip = tipAt(todayCount + day.length);
    candidates.push({
      category: AI_PROACTIVE_TIP,
      text: tip.text,
      askText: tip.ask,
    });
  }

  if (
    candidates.length === 0 &&
    !used.has(AI_PROACTIVE_TIP_EXTRA) &&
    todayCount >= 1
  ) {
    const tip = tipAt(todayCount + 3 + day.length);
    candidates.push({
      category: AI_PROACTIVE_TIP_EXTRA,
      text: tip.text,
      askText: tip.ask,
    });
  }

  if (candidates.length === 0 && !used.has(AI_PROACTIVE_CHAT_INVITE)) {
    const hour = new Date().getHours();
    const chatText =
      hour >= 21
        ? `${you}，夜深了。不想刷屏的话，我可以陪你聊两句再歇。`
        : hour < 11
          ? `${you}，新的一天。有空的话找我随便聊聊也行。`
          : `${companion}在这儿。无聊或想说说话，随时点我。`;
    candidates.push({
      category: AI_PROACTIVE_CHAT_INVITE,
      text: chatText,
      askText: "嗨，陪我随便聊两句吧。",
    });
  }

  const candidate = candidates[0] ?? null;
  if (!candidate) return null;

  const id = newId();
  const now = new Date();
  const label =
    PROACTIVE_CATEGORY_LABEL[candidate.category] || candidate.category;
  try {
    await db.insert(aiProactiveEvent).values({
      id,
      userId,
      category: candidate.category,
      day,
      payload: {
        text: candidate.text,
        askText: candidate.askText,
        label,
      },
      dismissedAt: null,
      createdAt: now,
    });
  } catch {
    // 唯一约束冲突：同日已有
    return null;
  }

  return {
    id,
    category: candidate.category,
    label,
    text: candidate.text,
    askText: candidate.askText,
    createdAt: now.toISOString(),
  };
}

export async function dismissProactiveBubble(userId: string, eventId: string) {
  const now = new Date();
  await getDb()
    .update(aiProactiveEvent)
    .set({ dismissedAt: now })
    .where(
      and(
        eq(aiProactiveEvent.id, eventId),
        eq(aiProactiveEvent.userId, userId),
      ),
    );
}

/**
 * 打卡按钮触发：立即弹出鼓励轻语（不走被动调度；可重复刷新同日同条）。
 * 不受勿扰/静默/日上限限制；会关掉当日其它未关闭轻语以免叠层。
 */
export async function emitCheckinCheerBubble(
  userId: string,
  input?: { title?: string | null; displayName?: string | null },
): Promise<ProactiveBubble> {
  const pref = await getCompanionPref(userId);
  const you =
    pref.userAddress && pref.userAddress !== "你"
      ? pref.userAddress
      : input?.displayName?.trim() || "你";
  const title = (input?.title ?? "").trim().slice(0, 16);
  const text = title
    ? `${you}，「${title}」打卡好了，稳稳的。继续保持～`
    : `${you}，打卡好了，稳稳的。继续保持～`;
  const askText = "今天打卡感觉怎么样？陪我聊两句。";
  const label = PROACTIVE_CATEGORY_LABEL[AI_PROACTIVE_CHECKIN_CHEER] || "鼓励";
  const day = localDayString();
  const now = new Date();
  const db = getDb();

  // 关掉当日其它未关闭气泡，避免叠着看不见鼓励
  await db
    .update(aiProactiveEvent)
    .set({ dismissedAt: now })
    .where(
      and(
        eq(aiProactiveEvent.userId, userId),
        eq(aiProactiveEvent.day, day),
        isNull(aiProactiveEvent.dismissedAt),
        ne(aiProactiveEvent.category, AI_PROACTIVE_CHECKIN_CHEER),
      ),
    );

  const existing = await db
    .select()
    .from(aiProactiveEvent)
    .where(
      and(
        eq(aiProactiveEvent.userId, userId),
        eq(aiProactiveEvent.day, day),
        eq(aiProactiveEvent.category, AI_PROACTIVE_CHECKIN_CHEER),
      ),
    )
    .limit(1);

  const payload = { text, askText, label };
  let id: string;
  if (existing[0]) {
    id = existing[0].id;
    await db
      .update(aiProactiveEvent)
      .set({
        payload,
        dismissedAt: null,
        createdAt: now,
      })
      .where(eq(aiProactiveEvent.id, id));
  } else {
    id = newId();
    await db.insert(aiProactiveEvent).values({
      id,
      userId,
      category: AI_PROACTIVE_CHECKIN_CHEER,
      day,
      payload,
      dismissedAt: null,
      createdAt: now,
    });
  }

  return {
    id,
    category: AI_PROACTIVE_CHECKIN_CHEER,
    label,
    text,
    askText,
    createdAt: now.toISOString(),
  };
}

/** 近 7 日气泡数（调试用） */
export async function countRecentProactive(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const rows = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(aiProactiveEvent)
    .where(
      and(
        eq(aiProactiveEvent.userId, userId),
        gte(aiProactiveEvent.createdAt, since),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}
