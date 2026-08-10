import { IconActionLink } from "@/components/ui/icon-action";
import { IconChevronRight } from "@/components/ui/icon-glyphs";
import { DueCardDeck } from "@/components/due/due-card-deck";
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
  /** 今时际首页用精简标题；临期提醒子页可隐藏（外层已有 PageHeader） */
  showHeading?: boolean;
  /** 首页紧凑：缩小标题与空态 */
  compact?: boolean;
  emptyHint?: string;
  /** deck=方形层叠翻阅（默认）；list=传统列表 */
  variant?: "deck" | "list";
};

/** 临期提醒（默认可翻阅方卡） */
export function DueReminderSection({
  items,
  showHeading = true,
  compact = false,
  emptyHint = "当前没有临期提醒。在来日途·规划里设置截止日期与提前提醒后，进入窗口即会出现在这里。",
  variant = "deck",
}: DueReminderSectionProps) {
  return (
    <section
      className={`flex flex-col ${compact ? "home-v1__pane gap-2" : "gap-3"}`}
    >
      {showHeading ? (
        <div
          className={
            compact
              ? "home-v1__split-head"
              : "home-v1__summary-head"
          }
        >
          <div>
            <h2>
              <PoeticName
                name="临期提醒"
                tip="来日途计划进入提醒窗口后的倒计时卡片"
              />
            </h2>
            {!compact ? (
              <p className="mt-1 text-sm text-[var(--mist)]">
                提醒窗口内的计划 · 可完成、延期或随想 · 左右翻阅
              </p>
            ) : null}
          </div>
          <IconActionLink
            href="/app/present/due"
            label="全部"
            className="oc-icon-action--accent home-v1__split-head-link"
          >
            <IconChevronRight size={14} />
          </IconActionLink>
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
      ) : variant === "deck" ? (
        <DueCardDeck items={items} showActions />
      ) : (
        <ul
          className={`flex flex-col ${compact ? "home-v1__due-list gap-2" : "gap-3"}`}
        >
          {items.map((item) => (
            <li key={item.id}>
              <DuePlanCard
                id={item.id}
                title={item.title}
                dueAt={item.dueAt}
                daysLeft={item.daysLeft}
                remindDays={item.remindDays}
                kindLabel={item.kindLabel}
                compact={compact}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
