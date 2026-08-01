import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveHasKeepableText,
  archiveReasonLabel,
  archiveTypeLabel,
  formatDwell,
  getArchiveItem,
  sourceModuleLabel,
} from "@/services/archive";
import {
  ARCHIVE_TYPE_DAILY_CHECKIN,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_CYCLE,
} from "@/db/schema";
import { FragmentActions } from "@/components/archive/fragment-actions";
import { KeepArchiveButton } from "@/components/archive/keep-archive-button";
import { QuoteNewActions } from "@/components/archive/quote-new-actions";
import { moodDisplay } from "@/lib/moods";
import { listArchiveItemTags } from "@/services/tags";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { cycleUnitLabel } from "@/lib/plan-kinds";
import { getFocusSession } from "@/services/focus";

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

  const isFragment = item.type === ARCHIVE_TYPE_MEMORY_FRAGMENT;
  const [tags, focusSession] = await Promise.all([
    listArchiveItemTags(userId, item.id),
    item.type === ARCHIVE_TYPE_FOCUS_RECORD && item.sourceFocusSessionId
      ? getFocusSession(userId, item.sourceFocusSessionId)
      : Promise.resolve(null),
  ]);

  return (
    <main className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={backHref} className="ui-btn-ghost ui-btn-sm w-fit">
          ← {backLabel}
        </Link>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <KeepArchiveButton
              itemId={item.id}
              kept={item.inKnowledge}
              canKeep={archiveHasKeepableText(item)}
            />
            {isFragment ? <FragmentActions itemId={item.id} /> : null}
          </div>
          <QuoteNewActions archiveItemId={item.id} />
        </div>
      </div>

      <article className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
        <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--teal)]">
          {archiveTypeLabel(item.type)}
          {item.inKnowledge ? " · 已藏忆" : ""}
          {isFragment ? " · 可编辑" : " · 只读 · 不可编辑"}
        </p>
        <h1 className="mt-1 text-lg tracking-[0.08em] text-[var(--paper)]">
          {item.title}
        </h1>
        {item.mood || tags.length > 0 ? (
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--mist)]">
            {item.mood ? <span>{moodDisplay(item.mood)}</span> : null}
            {tags.map((t) => (
              <span
                key={t.tagId}
                className="rounded border border-[var(--line)] px-1.5 py-0.5"
              >
                {t.nameSnapshot}
              </span>
            ))}
          </p>
        ) : null}
        <dl className="mt-2 grid gap-2 text-xs text-[var(--mist)] sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] tracking-wide opacity-70">
              {isFragment ? "拾取时间" : "归档时间"}
            </dt>
            <dd className="mt-0.5">{formatWhen(item.archivedAt)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] tracking-wide opacity-70">
              归档方式
            </dt>
            <dd className="mt-0.5">{archiveReasonLabel(item.archiveReason)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] tracking-wide opacity-70">
              来源
            </dt>
            <dd className="mt-0.5">{sourceModuleLabel(item.sourceModule)}</dd>
          </div>
          {item.inKnowledge && item.keptAt ? (
            <div>
              <dt className="font-mono text-[10px] tracking-wide opacity-70">
                藏忆时间
              </dt>
              <dd className="mt-0.5">{formatWhen(item.keptAt)}</dd>
            </div>
          ) : null}
          {item.type === ARCHIVE_TYPE_PLAN_CYCLE ||
          item.type === ARCHIVE_TYPE_DAILY_CHECKIN ? (
            <>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  累计完成
                </dt>
                <dd className="mt-0.5 text-[var(--paper)]">
                  {item.cycleCount ?? 0} 次
                  {item.type === ARCHIVE_TYPE_PLAN_CYCLE && item.cycleUnit
                    ? ` · ${cycleUnitLabel(item.cycleUnit, item.cycleEveryDays)}`
                    : null}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  最近一次
                </dt>
                <dd className="mt-0.5">{formatWhen(item.archivedAt)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  {item.type === ARCHIVE_TYPE_DAILY_CHECKIN
                    ? "习惯起始"
                    : "系列起始"}
                </dt>
                <dd className="mt-0.5">{formatWhen(item.sourceCreatedAt)}</dd>
              </div>
            </>
          ) : item.type === ARCHIVE_TYPE_FOCUS_RECORD ? (
            <>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  专注时长
                </dt>
                <dd className="mt-0.5">
                  {formatFocusDurationMs(focusSession?.accumulatedMs ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  开始时间
                </dt>
                <dd className="mt-0.5">{formatWhen(item.sourceCreatedAt)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  结束时间
                </dt>
                <dd className="mt-0.5">{formatWhen(item.sourceUpdatedAt)}</dd>
              </div>
            </>
          ) : isFragment ? (
            <div>
              <dt className="font-mono text-[10px] tracking-wide opacity-70">
                最后编辑
              </dt>
              <dd className="mt-0.5">{formatWhen(item.updatedAt)}</dd>
            </div>
          ) : (
            <div>
              <dt className="font-mono text-[10px] tracking-wide opacity-70">
                停留时长
              </dt>
              <dd className="mt-0.5">
                {formatDwell(item.sourceCreatedAt, item.archivedAt)}
                <span className="ml-2 font-mono text-[10px] opacity-60">
                  （创建 → 归档）
                </span>
              </dd>
            </div>
          )}
          {item.type === ARCHIVE_TYPE_ESSAY_SEDIMENT ? (
            <>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  原创建时间
                </dt>
                <dd className="mt-0.5">{formatWhen(item.sourceCreatedAt)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  原最后编辑
                </dt>
                <dd className="mt-0.5">{formatWhen(item.sourceUpdatedAt)}</dd>
              </div>
            </>
          ) : null}
        </dl>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="mt-6 max-h-[420px] w-full rounded-lg border border-[var(--line)] object-contain"
          />
        ) : null}
        <div
          className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--paper)] select-text"
          aria-readonly={isFragment ? undefined : "true"}
        >
          {item.body.trim() || (item.imageUrl ? "" : "（无正文）")}
        </div>
      </article>
    </main>
  );
}
