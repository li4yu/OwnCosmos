import Link from "next/link";
import { remainingDaysLabel } from "@/lib/due-labels";
import { formatDueDateInput } from "@/lib/plan-dates";
import { planKindLabel } from "@/lib/plan-kinds";

export type FuturePlanPreviewItem = {
  id: string;
  title: string;
  kind: string;
  dueAt: Date | null;
  daysLeft: number | null;
};

type FuturePlanPreviewProps = {
  items: FuturePlanPreviewItem[];
};

/** 来日途 · 近期规划快览 */
export function FuturePlanPreview({ items }: FuturePlanPreviewProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs tracking-[0.1em] text-[var(--paper)]">
          近期规划
        </h3>
        <Link
          href="/app/future/plans"
          className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
        >
          全部 →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="mt-3 flex flex-1 flex-col justify-center gap-2">
          <p className="text-xs text-[var(--mist)]">
            还没有进行中的规划。立一个日子，交给来日途。
          </p>
          <Link
            href="/app/future/plans/new"
            className="ui-btn-primary ui-btn-sm w-fit"
          >
            新建计划
          </Link>
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/app/future/plans/${item.id}`}
                className="ui-hover-card block rounded border border-[var(--line)] px-2 py-1.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-[var(--paper)]">
                    {item.title || "无标题"}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] text-[var(--mist)]">
                    {planKindLabel(item.kind)}
                  </span>
                </div>
                {item.dueAt ? (
                  <p
                    className={`mt-0.5 font-mono text-[10px] ${
                      item.daysLeft != null && item.daysLeft < 0
                        ? "text-[var(--danger)]"
                        : "text-[var(--amber)]"
                    }`}
                  >
                    {item.daysLeft != null
                      ? remainingDaysLabel(item.daysLeft)
                      : ""}
                    <span className="ml-1.5 text-[var(--mist)]">
                      {formatDueDateInput(item.dueAt)}
                    </span>
                  </p>
                ) : (
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--mist)]">
                    无截止日期
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
