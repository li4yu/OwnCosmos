/** 拾忆馆藏内部类型分区（三级导航） */
export const GALLERY_SECTIONS = [
  {
    id: "all",
    href: "/app/past/gallery",
    name: "全部",
    tip: "馆藏总览，含各类沉淀与碎片",
    filterType: null as string | null,
    ready: true,
  },
  {
    id: "essay-sediment",
    href: "/app/past/gallery/essay-sediment",
    name: "随笔沉淀",
    tip: "从今时际归档而来的随笔快照，只读回顾",
    filterType: "essay_sediment",
    ready: true,
  },
] as const;

export function matchGallerySection(pathname: string) {
  if (pathname === "/app/past/gallery" || pathname.startsWith("/app/past/gallery/")) {
    // Prefer specific section over "all"
    const specific = GALLERY_SECTIONS.find(
      (s) =>
        s.id !== "all" &&
        (pathname === s.href || pathname.startsWith(`${s.href}/`)),
    );
    if (specific) return specific;
    // detail pages /app/past/gallery/[id] → treat as all
    return GALLERY_SECTIONS.find((s) => s.id === "all") ?? null;
  }
  return null;
}
