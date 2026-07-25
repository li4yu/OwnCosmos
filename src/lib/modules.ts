/**
 * 顶栏与各模块子功能注册表（对照产品架构 / 各模块子功能说明）
 * 顶栏时序：过去 → 现在 → 将来，其后接专注「凝时」
 */

export type SubfeatureDef = {
  id: string;
  href: string;
  name: string;
  tip: string;
  /** Phase 3 仅流思笺为 true，其余占位 */
  ready: boolean;
};

export type AppModuleDef = {
  id: string;
  href: string;
  name: string;
  tip: string;
  eyebrow: string;
  ready: boolean;
  /** 无子功能（如首页）则为空 */
  subfeatures: readonly SubfeatureDef[];
};

export const APP_MODULES: readonly AppModuleDef[] = [
  {
    id: "home",
    href: "/app",
    name: "首页",
    tip: "欢迎与快捷入口，回到登录后的起点",
    eyebrow: "HOME",
    ready: true,
    subfeatures: [],
  },
  {
    id: "past",
    href: "/app/past",
    name: "昔时往",
    tip: "你的过去沉淀库：回顾已归档的思绪、规划与回忆",
    eyebrow: "PAST",
    ready: true,
    subfeatures: [
      {
        id: "gallery",
        href: "/app/past/gallery",
        name: "拾忆馆藏",
        tip: "统一收纳流入的随笔、规划归档、专注记录，以及你上传的照片与文字回忆",
        ready: true,
      },
      {
        id: "corridor",
        href: "/app/past/corridor",
        name: "往迹廊",
        tip: "以时间为线索，回看你完整的思绪轨迹与记录密度",
        ready: false,
      },
      {
        id: "mood",
        href: "/app/past/mood",
        name: "心绪鉴",
        tip: "追踪情绪与心态变化，观察自己的成长规律",
        ready: false,
      },
    ],
  },
  {
    id: "present",
    href: "/app/present",
    name: "今时际",
    tip: "抓住此刻的思绪，并查看临近的提醒",
    eyebrow: "PRESENT",
    ready: true,
    subfeatures: [
      {
        id: "essays",
        href: "/app/present/essays",
        name: "流思笺",
        tip: "快速记下当下灵感与草稿，未归档前可随时改",
        ready: true,
      },
      {
        id: "due",
        href: "/app/present/due",
        name: "临期帖",
        tip: "展示即将到来的目标与日子，可完成、延期或记下随想",
        ready: false,
      },
    ],
  },
  {
    id: "future",
    href: "/app/future",
    name: "来日途",
    tip: "规划未来的目标、日子与自律计划",
    eyebrow: "FUTURE",
    ready: true,
    subfeatures: [
      {
        id: "plans",
        href: "/app/future/plans",
        name: "规划",
        tip: "单次事件：标题、描述与截止日期；可标记完成",
        ready: true,
      },
      {
        id: "cycles",
        href: "/app/future/cycles",
        name: "轮期",
        tip: "按周期自动重复的计划，当期结束后开启下一轮",
        ready: false,
      },
      {
        id: "capsule",
        href: "/app/future/capsule",
        name: "时间胶囊",
        tip: "写给未来的自己，到了设定日期才能打开",
        ready: false,
      },
      {
        id: "daily",
        href: "/app/future/daily",
        name: "日课",
        tip: "给今天的自律计划打个卡，可写一句心得",
        ready: false,
      },
    ],
  },
  {
    id: "focus",
    href: "/app/focus",
    name: "凝时",
    tip: "专注计时：正计时或倒计时，把心神收在当下",
    eyebrow: "FOCUS",
    ready: true,
    subfeatures: [
      {
        id: "forward",
        href: "/app/focus/forward",
        name: "顺钟",
        tip: "正向累计专注时长，可暂停、继续、结束",
        ready: false,
      },
      {
        id: "countdown",
        href: "/app/focus/countdown",
        name: "逆漏",
        tip: "设定时长倒数，到点提醒，适合限时任务",
        ready: false,
      },
      {
        id: "records",
        href: "/app/focus/records",
        name: "凝录",
        tip: "记下这段专注的收获与心情；结束后会沉淀进昔时往",
        ready: false,
      },
    ],
  },
] as const;

export type AppModuleId = (typeof APP_MODULES)[number]["id"];

/** 首页快捷进入：四大核心（按时序），不含首页 */
export const QUICK_JUMP_MODULES = APP_MODULES.filter((m) => m.id !== "home");

export function getModule(id: string) {
  return APP_MODULES.find((m) => m.id === id) ?? null;
}

export function matchModule(pathname: string) {
  if (pathname === "/app") {
    return APP_MODULES.find((m) => m.id === "home") ?? null;
  }
  return (
    APP_MODULES.find(
      (m) =>
        m.id !== "home" &&
        (pathname === m.href || pathname.startsWith(`${m.href}/`)),
    ) ?? null
  );
}

export function matchSubfeature(pathname: string, moduleId: string) {
  const mod = getModule(moduleId);
  if (!mod) return null;
  return (
    mod.subfeatures.find(
      (s) => pathname === s.href || pathname.startsWith(`${s.href}/`),
    ) ?? null
  );
}
