import {
  archiveDateRangeError,
  dayBoundsFromInput,
} from "@/lib/archive-query";
import { isMoodKey } from "@/lib/moods";

export const ESSAY_PAGE_SIZE = 10;

export type EssayListSearch = {
  q?: string;
  tag?: string;
  mood?: string;
  from?: string;
  to?: string;
  page?: string;
};

export function parseEssayListSearch(sp: EssayListSearch) {
  const titleQ = (sp.q ?? "").trim();
  const tagRaw = (sp.tag ?? "").trim();
  const moodRaw = (sp.mood ?? "").trim();
  const fromRaw = (sp.from ?? "").trim();
  const toRaw = (sp.to ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const rangeError = archiveDateRangeError(fromRaw, toRaw);
  const fromBound = dayBoundsFromInput(fromRaw);
  const toBound = dayBoundsFromInput(toRaw);
  const mood = isMoodKey(moodRaw) ? moodRaw : undefined;

  return {
    titleQ: titleQ || undefined,
    tagInput: tagRaw,
    tagId: tagRaw || undefined,
    moodInput: mood ?? "",
    mood,
    fromInput: fromRaw,
    toInput: toRaw,
    dateRangeError: rangeError
      ? "更新止日期不能早于起日期"
      : null,
    updatedFrom: rangeError ? undefined : fromBound.start,
    updatedTo: rangeError ? undefined : toBound.end,
    page,
  };
}

export function buildEssayQueryHref(
  basePath: string,
  params: {
    q?: string;
    tag?: string;
    mood?: string;
    from?: string;
    to?: string;
    page?: number;
  },
) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.tag?.trim()) sp.set("tag", params.tag.trim());
  if (params.mood?.trim()) sp.set("mood", params.mood.trim());
  if (params.from?.trim()) sp.set("from", params.from.trim());
  if (params.to?.trim()) sp.set("to", params.to.trim());
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
