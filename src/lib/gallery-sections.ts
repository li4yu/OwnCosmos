import {
  ARCHIVE_TYPE_DAILY_CHECKIN,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_ESSAY_TOPIC,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_PLAN_CYCLE,
} from "@/db/schema";

/** 馆藏内部类型分区（三级导航；后续类型只加分区） */
export const GALLERY_SECTIONS = [
  {
    id: "all",
    href: "/app/past/gallery",
    name: "全部",
    tip: "馆藏总览，含各类沉淀；可查询并批量进知识库 / 删除归档",
    filterType: null as string | null,
    ready: true,
    emptyHint:
      "馆藏尚空。可在随笔中手动归档，或等待超过设定小时数未编辑后自动沉淀；亦可上传记忆碎片。",
  },
  {
    id: "essay-sediment",
    href: "/app/past/gallery/essay-sediment",
    name: "随笔归档",
    tip: "从今时际归档而来的随笔快照，只读回顾",
    filterType: ARCHIVE_TYPE_ESSAY_SEDIMENT,
    ready: true,
    emptyHint: "还没有随笔归档。去随笔写一条并归档，或等待自动沉淀。",
  },
  {
    id: "essay-topic",
    href: "/app/past/gallery/essay-topic",
    name: "专题归档",
    tip: "专题夹整夹沉淀；点开可看夹内各篇",
    filterType: ARCHIVE_TYPE_ESSAY_TOPIC,
    ready: true,
    emptyHint: "尚无专题归档。在随笔 · 专题随笔中「归档专题」后出现于此。",
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
    name: "周期计划归档",
    tip: "重复周期计划按系列计次，不每期占一条",
    filterType: ARCHIVE_TYPE_PLAN_CYCLE,
    ready: true,
    emptyHint: "尚无周期计划归档。来日途周期计划滚期或完成后，会在此累计次数。",
  },
  {
    id: "daily-checkin",
    href: "/app/past/gallery/daily-checkin",
    name: "每日打卡归档",
    tip: "每日打卡按习惯计次，心得写入馆藏",
    filterType: ARCHIVE_TYPE_DAILY_CHECKIN,
    ready: true,
    emptyHint: "尚无每日打卡归档。首页或每日打卡页打卡后，会在此累计次数。",
  },
  {
    id: "focus-record",
    href: "/app/past/gallery/focus-record",
    name: "专注记录",
    tip: "凝时专注结束后自动流入的记录",
    filterType: ARCHIVE_TYPE_FOCUS_RECORD,
    ready: true,
    emptyHint: "尚无专注记录。走完一次凝时正向计时并结束后，将沉淀到此分区。",
  },
  {
    id: "memory-fragment",
    href: "/app/past/gallery/memory-fragment",
    name: "记忆碎片",
    tip: "你在昔时往直接上传的照片或文字回忆，可编辑、可删除",
    filterType: ARCHIVE_TYPE_MEMORY_FRAGMENT,
    ready: true,
    emptyHint: "还没有记忆碎片。点「上传碎片」上传照片或写下文字回忆。",
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
