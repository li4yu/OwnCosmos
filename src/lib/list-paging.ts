/** 列表分页：默认 / 上下限（查询参数 size） */

export const DEFAULT_LIST_PAGE_SIZE = 10;
export const MIN_LIST_PAGE_SIZE = 1;
export const MAX_LIST_PAGE_SIZE = 100;

export function parseListPage(raw: string | undefined | null, fallback = 1) {
  const n = Number.parseInt((raw ?? "").trim() || String(fallback), 10);
  if (!Number.isFinite(n)) return Math.max(1, fallback);
  return Math.max(1, Math.floor(n));
}

export function parseListPageSize(
  raw: string | undefined | null,
  fallback = DEFAULT_LIST_PAGE_SIZE,
) {
  const n = Number.parseInt((raw ?? "").trim() || String(fallback), 10);
  if (!Number.isFinite(n)) {
    return clampListPageSize(fallback);
  }
  return clampListPageSize(n);
}

export function clampListPageSize(n: number) {
  return Math.min(
    MAX_LIST_PAGE_SIZE,
    Math.max(MIN_LIST_PAGE_SIZE, Math.floor(n)),
  );
}

/** 写入查询串：页码 >1、页大小 ≠ 默认时才带参 */
export function appendListPagingParams(
  sp: URLSearchParams,
  opts: { page?: number; pageSize?: number; pageKey?: string; sizeKey?: string },
) {
  const pageKey = opts.pageKey ?? "page";
  const sizeKey = opts.sizeKey ?? "size";
  if (opts.page && opts.page > 1) sp.set(pageKey, String(opts.page));
  if (
    opts.pageSize != null &&
    opts.pageSize !== DEFAULT_LIST_PAGE_SIZE
  ) {
    sp.set(sizeKey, String(clampListPageSize(opts.pageSize)));
  }
}
