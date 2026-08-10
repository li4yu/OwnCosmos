import Link from "next/link";
import {
  archiveReasonLabel,
  archiveTypeLabel,
  formatDwell,
  listArchiveItems,
} from "@/services/archive";
import {
  ARCHIVE_TYPE_DAILY_CHECKIN,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_ESSAY_TOPIC,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_CYCLE,
} from "@/db/schema";
import {
  galleryDetailHref,
  type GallerySectionId,
} from "@/lib/gallery-sections";
import { cycleUnitLabel } from "@/lib/plan-kinds";
import { PoeticName } from "@/components/ui/poetic-name";

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type ArchiveListProps = {
  items: Awaited<ReturnType<typeof listArchiveItems>>;
  emptyHint: string;
  sectionId?: GallerySectionId;
  showTypeChip?: boolean;
};

export function ArchiveItemList({
  items,
  emptyHint,
  sectionId = "all",
  showTypeChip = true,
}: ArchiveListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--mist)]">
        {emptyHint}
      </section>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={galleryDetailHref(item.id, sectionId)}
            className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--amber)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base text-[var(--paper)]">{item.title}</h3>
              <time className="shrink-0 font-mono text-[10px] tracking-wide text-[var(--mist)]">
                {formatWhen(item.archivedAt)}
              </time>
            </div>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] tracking-wide text-[var(--teal)]">
              {showTypeChip ? <span>{archiveTypeLabel(item.type)}</span> : null}
              <span>{archiveReasonLabel(item.archiveReason)}</span>
              {item.inKnowledge ? <span>已进知识库</span> : null}
              {item.type === ARCHIVE_TYPE_PLAN_CYCLE ||
              item.type === ARCHIVE_TYPE_DAILY_CHECKIN ? (
                <>
                  <span>已完成 {item.cycleCount ?? 0} 次</span>
                  {item.type === ARCHIVE_TYPE_PLAN_CYCLE && item.cycleUnit ? (
                    <span>
                      {cycleUnitLabel(item.cycleUnit, item.cycleEveryDays)}
                    </span>
                  ) : null}
                </>
              ) : null}
              {item.type === ARCHIVE_TYPE_ESSAY_TOPIC ? (
                <span>共 {item.cycleCount ?? 0} 篇</span>
              ) : null}
              {item.type === ARCHIVE_TYPE_ESSAY_SEDIMENT ? (
                <span>
                  停留 {formatDwell(item.sourceCreatedAt, item.archivedAt)}
                </span>
              ) : null}
            </p>
            {item.type === ARCHIVE_TYPE_MEMORY_FRAGMENT && item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="mt-2 max-h-28 rounded-md border border-[var(--line)] object-cover"
              />
            ) : null}
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[var(--mist)]">
              {item.type === ARCHIVE_TYPE_ESSAY_TOPIC
                ? item.body.trim() || `专题夹 · ${item.cycleCount ?? 0} 篇随笔`
                : item.body.trim() ||
                  (item.imageUrl ? "（图片碎片）" : "（无正文）")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function GalleryIntro() {
  return (
    <div>
      <h2 className="text-lg tracking-[0.12em] text-[var(--paper)]">
        <PoeticName
          name="馆藏"
          tip="统一收纳流入的随笔、规划归档、专注记录，以及你上传的照片与文字回忆"
        />
      </h2>
      <p className="mt-2 text-sm text-[var(--mist)]">
        总库按归档时间倒序；可进知识库。流入类只读；记忆碎片可编辑删除。
      </p>
    </div>
  );
}
