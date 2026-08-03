import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveHasKeepableText,
  archiveReasonLabel,
  archiveTypeLabel,
  formatDwell,
  getArchiveItem,
  listArchiveTopicEssays,
  sourceModuleLabel,
} from "@/services/archive";
import {
  ARCHIVE_TYPE_DAILY_CHECKIN,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_ESSAY_TOPIC,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_CYCLE,
} from "@/db/schema";
import { ArchiveMoodEditor } from "@/components/archive/archive-mood-editor";
import { FragmentActions } from "@/components/archive/fragment-actions";
import { KeepArchiveButton } from "@/components/archive/keep-archive-button";
import { QuoteNewActions } from "@/components/archive/quote-new-actions";
import { EssayBodyView } from "@/components/essays/essay-body-view";
import { moodDisplay } from "@/lib/moods";
import { listArchiveItemTags } from "@/services/tags";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { cycleUnitLabel } from "@/lib/plan-kinds";
import { getFocusSession } from "@/services/focus";
import { stripToPlainText } from "@/lib/rich-text";

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
  const isTopic = item.type === ARCHIVE_TYPE_ESSAY_TOPIC;
  const [tags, focusSession, topicEssays] = await Promise.all([
    listArchiveItemTags(userId, item.id),
    item.type === ARCHIVE_TYPE_FOCUS_RECORD && item.sourceFocusSessionId
      ? getFocusSession(userId, item.sourceFocusSessionId)
      : Promise.resolve(null),
    isTopic
      ? listArchiveTopicEssays(userId, item.id)
      : Promise.resolve([]),
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
          {!isTopic ? <QuoteNewActions archiveItemId={item.id} /> : null}
        </div>
      </div>

      <article className="oc-sheet oc-sheet--ruled">
        <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--teal)]">
          {archiveTypeLabel(item.type)}
          {item.inKnowledge ? " · 已藏忆" : ""}
          {isFragment ? " · 可编辑" : " · 只读 · 不可编辑"}
        </p>
        <h1 className="mt-1 text-lg tracking-[0.08em] text-[var(--paper)]">
          {item.title}
        </h1>
        {tags.length > 0 ? (
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
        ) : item.mood ? (
          <p className="mt-1 text-xs text-[var(--mist)]">
            {moodDisplay(item.mood)}
          </p>
        ) : null}
        {!isTopic ? (
          <ArchiveMoodEditor itemId={item.id} initialMood={item.mood} />
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
          {isTopic ? (
            <>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  夹内篇数
                </dt>
                <dd className="mt-0.5 text-[var(--paper)]">
                  {item.cycleCount ?? topicEssays.length} 篇
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-wide opacity-70">
                  专题建立
                </dt>
                <dd className="mt-0.5">{formatWhen(item.sourceCreatedAt)}</dd>
              </div>
            </>
          ) : item.type === ARCHIVE_TYPE_PLAN_CYCLE ||
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
        {!isTopic ? (
          isFragment ? (
            <div
              className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--paper)] select-text"
            >
              {item.body.trim() || (item.imageUrl ? "" : "（无正文）")}
            </div>
          ) : (
            <EssayBodyView
              body={item.body}
              bodyFormat={item.bodyFormat}
              className="mt-6 text-base leading-8 text-[var(--paper)] select-text"
              empty={item.imageUrl ? "" : "（无正文）"}
            />
          )
        ) : stripToPlainText(item.body) ? (
          <EssayBodyView
            body={item.body}
            bodyFormat={item.bodyFormat}
            className="mt-4 text-sm leading-7 text-[var(--mist)]"
          />
        ) : null}
      </article>

      {isTopic ? (
        <section className="flex flex-col gap-2">
          <h2 className="oc-section-label">夹内随笔</h2>
          {topicEssays.length === 0 ? (
            <p className="oc-empty">没有夹内篇快照。</p>
          ) : (
            <ul className="oc-scroll">
              {topicEssays.map((entry, index) => (
                <li key={entry.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="oc-scroll__title text-[1rem]">
                      <span className="mr-1.5 font-mono text-[10px] text-[var(--mist)]">
                        {index + 1}.
                      </span>
                      {entry.title}
                    </h3>
                    <time className="oc-scroll__meta">
                      {formatWhen(entry.sourceUpdatedAt)}
                    </time>
                  </div>
                  {entry.mood ? (
                    <p className="mt-0.5 text-xs text-[var(--teal)]">
                      {moodDisplay(entry.mood)}
                    </p>
                  ) : null}
                  <EssayBodyView
                    body={entry.body}
                    bodyFormat={entry.bodyFormat}
                    className="oc-scroll__body"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
