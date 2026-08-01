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

export const MATERIAL_PAGE_SIZE = 10;

export const MATERIAL_SOURCE_OPTIONS = [
  { value: "", label: "全部来源" },
  { value: MATERIAL_SOURCE_MANUAL, label: "手动" },
  { value: MATERIAL_SOURCE_ESSAY, label: "流思笺" },
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
};

export function parseMaterialListSearch(sp: MaterialListSearch) {
  const titleQ = (sp.q ?? "").trim();
  const sourceRaw = (sp.source ?? "").trim();
  const fromRaw = (sp.from ?? "").trim();
  const toRaw = (sp.to ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
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
  },
) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.source?.trim()) sp.set("source", params.source.trim());
  if (params.from?.trim()) sp.set("from", params.from.trim());
  if (params.to?.trim()) sp.set("to", params.to.trim());
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
