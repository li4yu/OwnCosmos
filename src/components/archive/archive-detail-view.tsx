import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveReasonLabel,
  archiveTypeLabel,
  formatDwell,
  getArchiveItem,
} from "@/services/archive";
import { ARCHIVE_TYPE_ESSAY_SEDIMENT } from "@/db/schema";

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type ArchiveDetailProps = {
  userId: string;
  itemId: string;
  backHref: string;
  backLabel: string;
};

export async function ArchiveDetailView({
  userId,
  itemId,
  backHref,
  backLabel,
}: ArchiveDetailProps) {
  const item = await getArchiveItem(userId, itemId);
  if (!item) notFound();

  return (
    <main className="flex flex-col gap-6">
      <Link href={backHref} className="ui-btn-ghost ui-btn-sm w-fit">
        ← {backLabel}
      </Link>

      <article className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--teal)]">
          {archiveTypeLabel(item.type)} · 只读
        </p>
        <h1 className="mt-2 text-2xl tracking-[0.08em] text-[var(--paper)]">
          {item.title}
        </h1>
        <dl className="mt-4 grid gap-2 text-sm text-[var(--mist)] sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] tracking-wide opacity-70">
              归档时间
            </dt>
            <dd>{formatWhen(item.archivedAt)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] tracking-wide opacity-70">
              归档方式
            </dt>
            <dd>{archiveReasonLabel(item.archiveReason)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] tracking-wide opacity-70">
              来源模块
            </dt>
            <dd>
              {item.sourceModule === "present" ? "今时际" : item.sourceModule}
            </dd>
          </div>
          {item.type === ARCHIVE_TYPE_ESSAY_SEDIMENT ? (
            <div>
              <dt className="font-mono text-[10px] tracking-wide opacity-70">
                停留时长
              </dt>
              <dd>{formatDwell(item.sourceCreatedAt, item.archivedAt)}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--paper)]">
          {item.body.trim() || "（无正文）"}
        </div>
      </article>
    </main>
  );
}
