import {
  archiveDateRangeError,
  dayBoundsFromInput,
} from "@/lib/archive-query";
import {
  DEFAULT_LIST_PAGE_SIZE,
  appendListPagingParams,
  parseListPage,
  parseListPageSize,
} from "@/lib/list-paging";
import {
  PLAN_KIND_ONCE,
  PLAN_KIND_VISION,
  type PlanKind,
} from "@/lib/plan-kinds";

export const PLAN_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export const PLAN_LIST_KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "类型不限" },
  { value: PLAN_KIND_ONCE, label: "单次" },
  { value: PLAN_KIND_VISION, label: "愿景" },
];

export type PlanListSearch = {
  q?: string;
  kind?: string;
  from?: string;
  to?: string;
  page?: string;
  cpage?: string;
  size?: string;
};

export function parsePlanListSearch(sp: PlanListSearch) {
  const titleQ = (sp.q ?? "").trim();
  const kindRaw = (sp.kind ?? "").trim();
  const fromRaw = (sp.from ?? "").trim();
  const toRaw = (sp.to ?? "").trim();
  const page = parseListPage(sp.page);
  const cpage = parseListPage(sp.cpage);
  const pageSize = parseListPageSize(sp.size, PLAN_PAGE_SIZE);
  const rangeError = archiveDateRangeError(fromRaw, toRaw);
  const fromBound = dayBoundsFromInput(fromRaw);
  const toBound = dayBoundsFromInput(toRaw);
  const kind: PlanKind | undefined =
    kindRaw === PLAN_KIND_ONCE || kindRaw === PLAN_KIND_VISION
      ? kindRaw
      : undefined;

  return {
    titleQ: titleQ || undefined,
    kindInput: kind ?? "",
    kind,
    fromInput: fromRaw,
    toInput: toRaw,
    dateRangeError: rangeError ? "截止止日期不能早于起日期" : null,
    dueFrom: rangeError ? undefined : fromBound.start,
    dueTo: rangeError ? undefined : toBound.end,
    page,
    cpage,
    pageSize,
  };
}

export function buildPlanQueryHref(
  basePath: string,
  params: {
    q?: string;
    kind?: string;
    from?: string;
    to?: string;
    page?: number;
    cpage?: number;
    pageSize?: number;
  },
) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.kind?.trim()) sp.set("kind", params.kind.trim());
  if (params.from?.trim()) sp.set("from", params.from.trim());
  if (params.to?.trim()) sp.set("to", params.to.trim());
  appendListPagingParams(sp, {
    page: params.page,
    pageSize: params.pageSize,
  });
  if (params.cpage && params.cpage > 1) sp.set("cpage", String(params.cpage));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
