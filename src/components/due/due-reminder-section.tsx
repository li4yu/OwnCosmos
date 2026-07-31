import Link from "next/link";
import { DuePlanCard } from "@/components/due/due-plan-card";
import { PoeticName } from "@/components/ui/poetic-name";

export type DueReminderListItem = {
  id: string;
  title: string;
  dueAt: Date;
  daysLeft: number;
  remindDays: number;
  kindLabel?: string;
};

type DueReminderSectionProps = {
  items: DueReminderListItem[];
  /** 今时际首页用精简标题；临期帖子页可隐藏（外层已有 PageHeader） */
  showHeading?: boolean;
  /** 首页紧凑：缩小标题与空态 */
  compact?: boolean;
  emptyHint?: string;
};

/** 临期帖卡片列表（可挂在今时际首页或临期帖子页） */
export function DueReminderSection({
  items,
  showHeading = true,
  compact = false,
  emptyHint = "当前没有临期提醒。在来日途·规划里设置截止日期与临期配后，进入窗口即会出现在这里。",
}: DueReminderSectionProps) {
  return (
    <section className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      {showHeading ? (
        <div className="home-v1__summary-head !mb-0">
          <div>
            <h2
              className={
                compact
                  ? "text-sm tracking-[0.12em] text-[var(--paper)]"
                  : "text-lg tracking-[0.12em] text-[var(--paper)]"
              }
            >
              <PoeticName
                name="临期帖"
              tip="来日途计划进入提醒窗口后的倒计时卡片"
            />
            </h2>
            {!compact ? (
              <p className="mt-1 text-sm text-[var(--mist)]">
                提醒窗口内的计划 · 可完成、延期或缘想
              </p>
            ) : null}
          </div>
          <Link
            href="/app/present/due"
            className="font-mono text-[10px] tracking-wide text-[var(--amber)] hover:underline"
          >
            全部 →
          </Link>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div
          className={`rounded-xl border border-dashed border-[var(--line)] text-center text-sm text-[var(--mist)] ${
            compact ? "px-3 py-4" : "p-6"
          }`}
        >
          {emptyHint}
        </div>
      ) : (
        <ul
          className={`flex flex-col ${compact ? "home-v1__due-list gap-2" : "gap-3"}`}
        >
          {items.map((item) => (
            <DuePlanCard
              key={item.id}
              id={item.id}
              title={item.title}
              dueAt={item.dueAt}
              daysLeft={item.daysLeft}
              remindDays={item.remindDays}
              kindLabel={item.kindLabel}
              compact={compact}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
