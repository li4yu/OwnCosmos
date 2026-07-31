import Link from "next/link";
import { notFound } from "next/navigation";
import {
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
  ARCHIVE_TYPE_PLAN_CYCLE,
} from "@/db/schema";
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

  const focusSession =
    item.type === ARCHIVE_TYPE_FOCUS_RECORD && item.sourceFocusSessionId
      ? await getFocusSession(userId, item.sourceFocusSessionId)
      : null;

  return (
    <main className="flex flex-col gap-6">
      <Link href={backHref} className="ui-btn-ghost ui-btn-sm w-fit">
        ← {backLabel}
      </Link>

      <article className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--teal)]">
          {archiveTypeLabel(item.type)} · 只读 · 不可编辑
        </p>
        <h1 className="mt-2 text-2xl tracking-[0.08em] text-[var(--paper)]">
          {item.title}
        </h1>
        <dl className="mt-4 grid gap-3 text-sm text-[var(--mist)] sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] tracking-wide opacity-70">
              归档时间
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
        <div
          className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--paper)] select-text"
          aria-readonly="true"
        >
          {item.body.trim() || "（无正文）"}
        </div>
      </article>
    </main>
  );
}
