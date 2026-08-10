import {
  archiveDateRangeError,
  dayBoundsFromInput,
} from "@/lib/archive-query";
import {
  MATERIAL_SOURCE_ARCHIVE,
  MATERIAL_SOURCE_ESSAY,
  MATERIAL_SOURCE_MANUAL,
  MATERIAL_SOURCE_PLAN,
} from "@/db/schema";
import {
  DEFAULT_LIST_PAGE_SIZE,
  appendListPagingParams,
  parseListPage,
  parseListPageSize,
} from "@/lib/list-paging";

export const MATERIAL_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export const MATERIAL_SOURCE_OPTIONS = [
  { value: "", label: "全部来源" },
  { value: MATERIAL_SOURCE_MANUAL, label: "手动" },
  { value: MATERIAL_SOURCE_ESSAY, label: "随笔" },
  { value: MATERIAL_SOURCE_ARCHIVE, label: "馆藏" },
  { value: MATERIAL_SOURCE_PLAN, label: "规划" },
] as const;

const SOURCE_SET = new Set<string>(
  MATERIAL_SOURCE_OPTIONS.map((o) => o.value).filter(Boolean),
);

export type MaterialListSearch = {
  q?: string;
  source?: string;
  from?: string;
  to?: string;
  page?: string;
  size?: string;
};

export function parseMaterialListSearch(sp: MaterialListSearch) {
  const titleQ = (sp.q ?? "").trim();
  const sourceRaw = (sp.source ?? "").trim();
  const fromRaw = (sp.from ?? "").trim();
  const toRaw = (sp.to ?? "").trim();
  const page = parseListPage(sp.page);
  const pageSize = parseListPageSize(sp.size, MATERIAL_PAGE_SIZE);
  const rangeError = archiveDateRangeError(fromRaw, toRaw);
  const fromBound = dayBoundsFromInput(fromRaw);
  const toBound = dayBoundsFromInput(toRaw);
  const source = sourceRaw && SOURCE_SET.has(sourceRaw) ? sourceRaw : undefined;

  return {
    titleQ: titleQ || undefined,
    source,
    sourceInput: source ?? "",
    fromInput: fromRaw,
    toInput: toRaw,
    dateRangeError: rangeError
      ? "收藏止日期不能早于起日期"
      : null,
    createdFrom: rangeError ? undefined : fromBound.start,
    createdTo: rangeError ? undefined : toBound.end,
    page,
    pageSize,
  };
}

export function buildMaterialQueryHref(
  basePath: string,
  params: {
    q?: string;
    source?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.source?.trim()) sp.set("source", params.source.trim());
  if (params.from?.trim()) sp.set("from", params.from.trim());
  if (params.to?.trim()) sp.set("to", params.to.trim());
  appendListPagingParams(sp, {
    page: params.page,
    pageSize: params.pageSize,
  });
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
