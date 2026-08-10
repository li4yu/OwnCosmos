/**
 * 馆藏入口与详情链接（单页列表 + 筛选；不再按类型拆路由分区）
 */

export function galleryDetailHref(itemId: string) {
  return `/app/past/gallery/${itemId}`;
}

export function galleryListHref(opts?: { type?: string }) {
  const type = opts?.type?.trim();
  if (!type) return "/app/past/gallery";
  return `/app/past/gallery?type=${encodeURIComponent(type)}`;
}
