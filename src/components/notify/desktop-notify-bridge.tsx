"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export type DesktopNotifyDueItem = {
  id: string;
  title: string;
  daysLeft: number;
};

export type DesktopNotifyAnniversaryItem = {
  id: string;
  title: string;
  year: number;
};

type DesktopNotifyBridgeProps = {
  notifyEnabled: boolean;
  notifyDueReminder: boolean;
  anniversaryRemind: boolean;
  focusDnd: boolean;
  dueItems: DesktopNotifyDueItem[];
  anniversaryHits: DesktopNotifyAnniversaryItem[];
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function alreadyShown(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

function markShown(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

function fire(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag });
  } catch {
    /* ignore */
  }
}

/** 登录壳层：按偏好发浏览器桌面通知（同会话去重） */
export function DesktopNotifyBridge({
  notifyEnabled,
  notifyDueReminder,
  anniversaryRemind,
  focusDnd,
  dueItems,
  anniversaryHits,
}: DesktopNotifyBridgeProps) {
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    if (!notifyEnabled) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (focusDnd && pathname.startsWith("/app/focus")) return;
    if (ran.current) return;
    ran.current = true;

    const day = todayKey();

    if (notifyDueReminder && dueItems.length > 0) {
      const key = `oc-notify-due:${day}`;
      if (!alreadyShown(key)) {
        const top = dueItems[0];
        const more =
          dueItems.length > 1 ? `等 ${dueItems.length} 条临期` : top.title;
        fire(
          "自宇 · 临期提醒",
          dueItems.length > 1
            ? `${more}（最近：${top.title}，剩 ${top.daysLeft} 天）`
            : `「${top.title}」剩 ${top.daysLeft} 天`,
          key,
        );
        markShown(key);
      }
    }

    if (anniversaryRemind && anniversaryHits.length > 0) {
      const key = `oc-notify-anni:${day}`;
      if (!alreadyShown(key)) {
        const hit = anniversaryHits[0];
        fire(
          "自宇 · 同年回望",
          anniversaryHits.length > 1
            ? `往年今日有 ${anniversaryHits.length} 条沉淀（如 ${hit.year}「${hit.title}」）`
            : `${hit.year} 年今日：${hit.title}`,
          key,
        );
        markShown(key);
      }
    }
  }, [
    notifyEnabled,
    notifyDueReminder,
    anniversaryRemind,
    focusDnd,
    pathname,
    dueItems,
    anniversaryHits,
  ]);

  return null;
}
