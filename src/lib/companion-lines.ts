/**
 * 噜噜台词（写死；后续接 AI）
 * key：pathname 前缀，长路径优先匹配
 */

export type CompanionLine = {
  text: string;
  /** 展示毫秒 */
  durationMs?: number;
};

const DEFAULT_DURATION = 5600;

/** 登录进入壳层后的默认欢迎 */
export function loginWelcomeLine(userName?: string | null): CompanionLine {
  const name = userName?.trim() || "旅人";
  return {
    text: `哇，${name}回来啦～噜噜在这儿等你哟 ✦ 今天想去哪儿逛逛？`,
    durationMs: 6200,
  };
}

/** 路径 → 台词（按最长前缀匹配） */
const PATH_LINES: { prefix: string; text: string }[] = [
  // 子功能（先写长路径）
  {
    prefix: "/app/present/essays",
    text: "今天也遇到什么有趣的事情了吗，要跟我分享吗？✎ 噜噜竖起耳朵听～",
  },
  {
    prefix: "/app/present/due",
    text: "临近的日子在闪哦 ✦ 别慌，一件一件来，噜噜陪你盯着～",
  },
  {
    prefix: "/app/past/gallery",
    text: "拾忆馆藏打开啦…像翻一本软软的旧相册 ◕‿◕ 哪一段想再看看？",
  },
  {
    prefix: "/app/past/corridor",
    text: "往迹廊有点静呢…时间线慢慢铺开，噜噜踮脚跟在你后面～",
  },
  {
    prefix: "/app/past/mood",
    text: "心绪鉴～今天的心情像什么颜色呀？噜噜帮你记一笔 ✿",
  },
  {
    prefix: "/app/future/plans",
    text: "规划时间到！把想做的事轻轻放下，噜噜帮你看着日期 ✦",
  },
  {
    prefix: "/app/future/cycles",
    text: "轮期转起来啦～像小齿轮，噜噜也跟着转圈圈 (๑•̀ㅂ•́)و",
  },
  {
    prefix: "/app/future/capsule",
    text: "时间胶囊…写给未来的自己？噜噜会保密的，先封好～ ✉",
  },
  {
    prefix: "/app/future/daily",
    text: "日课打卡！今天也给自己一颗小星星好不好 ✦",
  },
  {
    prefix: "/app/focus/forward",
    text: "顺钟开始～噜噜把小嘴巴闭好，陪你安静待一会儿 ◡̈",
  },
  {
    prefix: "/app/focus/countdown",
    text: "逆漏滴答滴答…时间在溜走，噜噜帮你加油！٩(ˊᗜˋ*)و",
  },
  {
    prefix: "/app/focus/records",
    text: "凝录打开啦，把刚才的收获悄悄写下吧～噜噜给你竖大拇指 ✧",
  },
  // 一级模块
  {
    prefix: "/app/past",
    text: "昔时往～过去的光都收在这里。慢慢翻，噜噜不催你 ◕‿◕",
  },
  {
    prefix: "/app/present",
    text: "今时际！抓住此刻最好啦 ✎ 写一点、看一看，噜噜在旁边晃悠～",
  },
  {
    prefix: "/app/future",
    text: "来日途在发光…未来的路，一步也浪漫 ✦ 噜噜跟你一起想～",
  },
  {
    prefix: "/app/focus",
    text: "凝时模式～收一收心神。噜噜变成安静的小橘子坐着～ ◡̈",
  },
  {
    prefix: "/app/settings",
    text: "设置角落～调一调更舒服。有问题就戳噜噜（虽然我现在还不太会修…）",
  },
  {
    prefix: "/app/profile",
    text: "看看自己～噜噜觉得你今天也很发光 ✧",
  },
  {
    prefix: "/app",
    text: "又回到首页啦～像回家一样。噜噜在门口摇尾巴等你 ✦",
  },
];

export function lineForPathname(pathname: string): CompanionLine | null {
  const path = (pathname.replace(/\/$/, "") || "/") as string;
  const hit = PATH_LINES.find(
    (row) => path === row.prefix || path.startsWith(`${row.prefix}/`),
  );
  if (!hit) return null;
  return { text: hit.text, durationMs: DEFAULT_DURATION };
}

export { DEFAULT_DURATION as COMPANION_LINE_DURATION_MS };
