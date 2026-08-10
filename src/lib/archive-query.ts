import {
  ARCHIVE_TYPE_DAILY_CHECKIN,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_ESSAY_TOPIC,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_PLAN_CYCLE,
  ARCHIVE_TYPE_REFLECT_REPORT,
  WIPE_ARCHIVE_TYPES,
} from "@/db/schema";
import {
  DEFAULT_LIST_PAGE_SIZE,
  appendListPagingParams,
  parseListPage,
  parseListPageSize,
} from "@/lib/list-paging";
import { parseDueDateInput } from "@/lib/plan-dates";

export const ARCHIVE_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export type ArchiveTypeOption = {
  value: string;
  label: string;
};

export const GALLERY_TYPE_OPTIONS: ArchiveTypeOption[] = [
  { value: "", label: "全部类型" },
  { value: ARCHIVE_TYPE_ESSAY_SEDIMENT, label: "随笔归档" },
  { value: ARCHIVE_TYPE_ESSAY_TOPIC, label: "专题归档" },
  { value: ARCHIVE_TYPE_PLAN_ARCHIVE, label: "规划归档" },
  { value: ARCHIVE_TYPE_PLAN_CYCLE, label: "周期计划归档" },
  { value: ARCHIVE_TYPE_DAILY_CHECKIN, label: "每日打卡归档" },
  { value: ARCHIVE_TYPE_FOCUS_RECORD, label: "专注记录" },
  { value: ARCHIVE_TYPE_MEMORY_FRAGMENT, label: "记忆碎片" },
  { value: ARCHIVE_TYPE_REFLECT_REPORT, label: "自省报告" },
];

/** 进知识库状态筛选：空=不限 */
export const GALLERY_KEPT_OPTIONS: ArchiveTypeOption[] = [
  { value: "", label: "进知识库不限" },
  { value: "1", label: "已进知识库" },
  { value: "0", label: "未进知识库" },
];

const WIPE_TYPE_SET = new Set<string>(WIPE_ARCHIVE_TYPES);
const GALLERY_TYPE_SET = new Set(
  GALLERY_TYPE_OPTIONS.map((o) => o.value).filter(Boolean),
);

export function isWipeArchiveType(type: string) {
  return WIPE_TYPE_SET.has(type);
}

export type ArchiveListSearch = {
  q?: string;
  type?: string;
  /** 1=已进知识库 0=未进知识库 空=不限 */
  kept?: string;
  from?: string;
  to?: string;
  /** Phase 13: 标签 id */
  tag?: string;
  page?: string;
  size?: string;
};

/** 将 YYYY-MM-DD 转为当日起止（本地） */
export function dayBoundsFromInput(raw: string | undefined | null): {
  start: Date | undefined;
  end: Date | undefined;
} {
  if (!raw?.trim()) return { start: undefined, end: undefined };
  const day = parseDueDateInput(raw);
  if (!day) return { start: undefined, end: undefined };
  return {
    start: new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      0,
      0,
      0,
      0,
    ),
    end: new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      23,
      59,
      59,
      999,
    ),
  };
}

/** 起止皆填时：止日期不得早于起日期（同日合法，含起含止） */
export function archiveDateRangeError(
  fromRaw: string | undefined | null,
  toRaw: string | undefined | null,
): string | null {
  const from = (fromRaw ?? "").trim();
  const to = (toRaw ?? "").trim();
  if (!from || !to) return null;
  const fromDay = parseDueDateInput(from);
  const toDay = parseDueDateInput(to);
  if (!fromDay || !toDay) return null;
  if (toDay.getTime() < fromDay.getTime()) {
    return "归档止日期不能早于起日期";
  }
  return null;
}

export function parseArchiveListSearch(
  sp: ArchiveListSearch,
  opts?: { allowedTypes?: ReadonlySet<string> },
) {
  const titleQ = (sp.q ?? "").trim();
  const typeRaw = (sp.type ?? "").trim();
  const keptRaw = (sp.kept ?? "").trim();
  const fromRaw = (sp.from ?? "").trim();
  const toRaw = (sp.to ?? "").trim();
  const tagRaw = (sp.tag ?? "").trim();
  const page = parseListPage(sp.page);
  const pageSize = parseListPageSize(sp.size, ARCHIVE_PAGE_SIZE);
  const rangeError = archiveDateRangeError(fromRaw, toRaw);
  const fromBound = dayBoundsFromInput(fromRaw);
  const toBound = dayBoundsFromInput(toRaw);
  const allowed = opts?.allowedTypes;
  const type =
    typeRaw && (!allowed || allowed.has(typeRaw)) ? typeRaw : undefined;
  const inKnowledge =
    keptRaw === "1" ? true : keptRaw === "0" ? false : undefined;
  return {
    titleQ: titleQ || undefined,
    type,
    typeInput: type ?? "",
    keptInput: inKnowledge === true ? "1" : inKnowledge === false ? "0" : "",
    inKnowledge,
    fromInput: fromRaw,
    toInput: toRaw,
    tagInput: tagRaw,
    tagId: tagRaw || undefined,
    dateRangeError: rangeError,
    /** 起止颠倒时不应用日期条件，避免误筛出空集 */
    archivedFrom: rangeError ? undefined : fromBound.start,
    archivedTo: rangeError ? undefined : toBound.end,
    page,
    pageSize,
  };
}

export function parseGalleryListSearch(sp: ArchiveListSearch) {
  return parseArchiveListSearch(sp, { allowedTypes: GALLERY_TYPE_SET });
}

export function buildArchiveQueryHref(
  basePath: string,
  params: {
    q?: string;
    type?: string;
    kept?: string;
    from?: string;
    to?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.type?.trim()) sp.set("type", params.type.trim());
  if (params.kept?.trim()) sp.set("kept", params.kept.trim());
  if (params.from?.trim()) sp.set("from", params.from.trim());
  if (params.to?.trim()) sp.set("to", params.to.trim());
  if (params.tag?.trim()) sp.set("tag", params.tag.trim());
  appendListPagingParams(sp, {
    page: params.page,
    pageSize: params.pageSize,
  });
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
