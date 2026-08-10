export type CompanionJump = {
  id: string;
  title: string;
  href: string;
  eyebrow: string;
};

/** 从专科工具 meta 抽出前端可点的跳转卡 */
export function jumpsFromAgentMeta(
  intent: string,
  meta: Record<string, unknown>,
): CompanionJump[] {
  const out: CompanionJump[] = [];

  if (intent === "user_recall") {
    const hits = Array.isArray(meta.hits) ? meta.hits : [];
    for (const raw of hits) {
      const h = raw as {
        title?: string;
        archiveItemId?: string | null;
        sourceId?: string;
        id?: string;
      };
      const archiveId = (h.archiveItemId || h.sourceId || "").trim();
      if (!archiveId) continue;
      out.push({
        id: archiveId,
        title: (h.title || "馆藏条目").trim() || "馆藏条目",
        href: `/app/past/gallery/${archiveId}`,
        eyebrow: "馆藏",
      });
      if (out.length >= 3) break;
    }
  }

  if (intent === "due_coach") {
    const due = Array.isArray(meta.due) ? meta.due : [];
    for (const raw of due) {
      const d = raw as { id?: string; title?: string; href?: string };
      if (!d.id) continue;
      out.push({
        id: d.id,
        title: (d.title || "临期事项").trim(),
        href: d.href || `/app/present/due?focus=${d.id}`,
        eyebrow: "临期提醒",
      });
    }
  }

  if (intent === "action_hint") {
    const home = meta.home as
      | {
          dueItems?: { id?: string; title?: string; href?: string }[];
          checkinHints?: { title?: string; href?: string }[];
        }
      | undefined;
    for (const d of home?.dueItems ?? []) {
      if (!d.id) continue;
      out.push({
        id: `due-${d.id}`,
        title: (d.title || "临期").trim(),
        href: d.href || `/app/present/due?focus=${d.id}`,
        eyebrow: "临期",
      });
    }
    for (const [i, c] of (home?.checkinHints ?? []).entries()) {
      if (!c.href) continue;
      out.push({
        id: `checkin-${i}-${c.href}`,
        title: (c.title || "今日事项").trim(),
        href: c.href,
        eyebrow: "行事",
      });
    }
  }

  // focus_query：不挂「打开凝时」等通用快捷入口，避免回答旁再塞多余入口

  if (intent === "mood_care") {
    const mood = meta.mood as { hrefMood?: string } | undefined;
    out.push({
      id: "mood-home",
      title: "打开情绪复盘",
      href: mood?.hrefMood || "/app/past/mood",
      eyebrow: "情绪复盘",
    });
  }

  if (intent === "product_howto") {
    out.push({
      id: "guide",
      title: "打开使用说明",
      href: "/app/guide",
      eyebrow: "手册",
    });
  }

  // 去重保序
  const seen = new Set<string>();
  return out.filter((j) => {
    if (seen.has(j.href)) return false;
    seen.add(j.href);
    return true;
  }).slice(0, 5);
}

/** 正文里去掉裸 32 位 hex id，避免「可打开」堆 id */
export function scrubCompanionAnswer(text: string): string {
  return text
    .replace(/[a-f0-9]{32}/gi, "")
    .replace(/[ \t]+\|[ \t]+/g, " · ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
