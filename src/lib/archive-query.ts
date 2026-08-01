import {
  ARCHIVE_TYPE_DAILY_CHECKIN,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_PLAN_CYCLE,
  WIPE_ARCHIVE_TYPES,
} from "@/db/schema";
import { parseDueDateInput } from "@/lib/plan-dates";

export const ARCHIVE_PAGE_SIZE = 10;

export type ArchiveTypeOption = {
  value: string;
  label: string;
};

export const GALLERY_TYPE_OPTIONS: ArchiveTypeOption[] = [
  { value: "", label: "全部类型" },
  { value: ARCHIVE_TYPE_ESSAY_SEDIMENT, label: "随笔沉淀" },
  { value: ARCHIVE_TYPE_PLAN_ARCHIVE, label: "规划归档" },
  { value: ARCHIVE_TYPE_PLAN_CYCLE, label: "轮期归档" },
  { value: ARCHIVE_TYPE_DAILY_CHECKIN, label: "日课归档" },
  { value: ARCHIVE_TYPE_FOCUS_RECORD, label: "凝录" },
  { value: ARCHIVE_TYPE_MEMORY_FRAGMENT, label: "记忆碎片" },
];

/** 藏忆状态筛选：空=不限 */
export const GALLERY_KEPT_OPTIONS: ArchiveTypeOption[] = [
  { value: "", label: "藏忆不限" },
  { value: "1", label: "已藏忆" },
  { value: "0", label: "未藏忆" },
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
  /** 1=已藏忆 0=未藏忆 空=不限 */
  kept?: string;
  from?: string;
  to?: string;
  page?: string;
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
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
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
    dateRangeError: rangeError,
    /** 起止颠倒时不应用日期条件，避免误筛出空集 */
    archivedFrom: rangeError ? undefined : fromBound.start,
    archivedTo: rangeError ? undefined : toBound.end,
    page,
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
    page?: number;
  },
) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.type?.trim()) sp.set("type", params.type.trim());
  if (params.kept?.trim()) sp.set("kept", params.kept.trim());
  if (params.from?.trim()) sp.set("from", params.from.trim());
  if (params.to?.trim()) sp.set("to", params.to.trim());
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
