import Link from "next/link";
import {
  archiveReasonLabel,
  archiveTypeLabel,
  formatDwell,
  listArchiveItems,
} from "@/services/archive";
import { ARCHIVE_TYPE_ESSAY_SEDIMENT } from "@/db/schema";
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
  /** 详情链接前缀，默认馆藏 */
  detailBase?: string;
  showTypeChip?: boolean;
};

export function ArchiveItemList({
  items,
  emptyHint,
  detailBase = "/app/past/gallery",
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
            href={`${detailBase}/${item.id}`}
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
              {item.type === ARCHIVE_TYPE_ESSAY_SEDIMENT ? (
                <span>
                  停留 {formatDwell(item.sourceCreatedAt, item.archivedAt)}
                </span>
              ) : null}
            </p>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--mist)]">
              {item.body.trim() || "（无正文）"}
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
          name="拾忆馆藏"
          tip="统一收纳流入的随笔、规划归档、专注记录，以及你上传的照片与文字回忆"
        />
      </h2>
      <p className="mt-2 text-sm text-[var(--mist)]">
        总库按归档时间倒序；馆内可用「随笔沉淀」等分区筛选。
      </p>
    </div>
  );
}
