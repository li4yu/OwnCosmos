import Link from "next/link";
import { DuePlanCard } from "@/components/due/due-plan-card";
import { PoeticName } from "@/components/ui/poetic-name";
import { listDueReminderPlans } from "@/services/plans";

type DueReminderSectionProps = {
  items: Awaited<ReturnType<typeof listDueReminderPlans>>;
  /** 今时际首页用精简标题；临期帖子页可隐藏（外层已有 PageHeader） */
  showHeading?: boolean;
  emptyHint?: string;
};

/** 临期帖卡片列表（可挂在今时际首页或临期帖子页） */
export function DueReminderSection({
  items,
  showHeading = true,
  emptyHint = "当前没有临期提醒。在来日途·规划里设置截止日期与临期配后，进入窗口即会出现在这里。",
}: DueReminderSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      {showHeading ? (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg tracking-[0.12em] text-[var(--paper)]">
              <PoeticName
                name="临期帖"
                tip="来日途计划进入提醒窗口后的只读倒计时卡片"
              />
            </h2>
            <p className="mt-1 text-sm text-[var(--mist)]">
              提醒窗口内的计划 · 只读；完成即归档
            </p>
          </div>
          <Link
            href="/app/present/due"
            className="font-mono text-[10px] tracking-wide text-[var(--amber)] hover:underline"
          >
            查看全部 →
          </Link>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--mist)]">
          {emptyHint}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <DuePlanCard
              key={item.id}
              id={item.id}
              title={item.title}
              dueAt={item.dueAt}
              daysLeft={item.daysLeft}
              remindDays={item.remindDays}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
