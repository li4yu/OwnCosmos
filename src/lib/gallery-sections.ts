import {
  ARCHIVE_TYPE_DAILY_CHECKIN,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_PLAN_CYCLE,
} from "@/db/schema";

/** 拾忆馆藏内部类型分区（三级导航；后续类型只加分区） */
export const GALLERY_SECTIONS = [
  {
    id: "all",
    href: "/app/past/gallery",
    name: "全部",
    tip: "馆藏总览，含各类沉淀；可查询并批量藏忆 / 抹忆",
    filterType: null as string | null,
    ready: true,
    emptyHint:
      "馆藏尚空。可在流思笺中手动归档，或等待超过设定小时数未编辑后自动沉淀；亦可上传记忆碎片。",
  },
  {
    id: "essay-sediment",
    href: "/app/past/gallery/essay-sediment",
    name: "随笔沉淀",
    tip: "从今时际归档而来的随笔快照，只读回顾",
    filterType: ARCHIVE_TYPE_ESSAY_SEDIMENT,
    ready: true,
    emptyHint: "还没有随笔沉淀。去流思笺写一条并归档，或等待自动沉淀。",
  },
  {
    id: "plan-archive",
    href: "/app/past/gallery/plan-archive",
    name: "规划归档",
    tip: "来日途计划完成后沉淀于此",
    filterType: ARCHIVE_TYPE_PLAN_ARCHIVE,
    ready: true,
    emptyHint: "尚无规划归档。完成带临期的计划后，将沉淀到此分区。",
  },
  {
    id: "plan-cycle",
    href: "/app/past/gallery/plan-cycle",
    name: "轮期归档",
    tip: "重复轮期按系列计次，不每期占一条",
    filterType: ARCHIVE_TYPE_PLAN_CYCLE,
    ready: true,
    emptyHint: "尚无轮期归档。来日途轮期滚期或完成后，会在此累计次数。",
  },
  {
    id: "daily-checkin",
    href: "/app/past/gallery/daily-checkin",
    name: "日课归档",
    tip: "日课打卡按习惯计次，心得写入馆藏",
    filterType: ARCHIVE_TYPE_DAILY_CHECKIN,
    ready: true,
    emptyHint: "尚无日课归档。首页或日课页打卡后，会在此累计次数。",
  },
  {
    id: "focus-record",
    href: "/app/past/gallery/focus-record",
    name: "凝录",
    tip: "凝时专注结束后自动流入的记录",
    filterType: ARCHIVE_TYPE_FOCUS_RECORD,
    ready: true,
    emptyHint: "尚无凝录。走完一次凝时顺钟并结束后，将沉淀到此分区。",
  },
  {
    id: "memory-fragment",
    href: "/app/past/gallery/memory-fragment",
    name: "记忆碎片",
    tip: "你在昔时往直接上传的照片或文字回忆，可编辑、可删除",
    filterType: ARCHIVE_TYPE_MEMORY_FRAGMENT,
    ready: true,
    emptyHint: "还没有记忆碎片。点「拾取碎片」上传照片或写下文字回忆。",
  },
] as const;

export type GallerySectionId = (typeof GALLERY_SECTIONS)[number]["id"];

export function getGallerySection(id: string | null | undefined) {
  if (!id) return GALLERY_SECTIONS.find((s) => s.id === "all") ?? null;
  return GALLERY_SECTIONS.find((s) => s.id === id) ?? null;
}

/** 列表项详情链接：带上当前分区，便于返回与导航高亮 */
export function galleryDetailHref(itemId: string, sectionId: GallerySectionId) {
  const q = sectionId === "all" ? "" : `?section=${sectionId}`;
  return `/app/past/gallery/${itemId}${q}`;
}

export function matchGallerySection(
  pathname: string,
  sectionQuery?: string | null,
) {
  const byPath = GALLERY_SECTIONS.find(
    (s) =>
      pathname === s.href ||
      (s.id !== "all" && pathname.startsWith(`${s.href}/`)),
  );
  if (byPath) return byPath;

  if (pathname.startsWith("/app/past/gallery/")) {
    return getGallerySection(sectionQuery) ?? getGallerySection("all");
  }

  if (pathname === "/app/past/gallery") return getGallerySection("all");
  return null;
}
