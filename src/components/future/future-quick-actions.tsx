import Link from "next/link";

/** 来日途 · 快捷入口 */
export function FutureQuickActions() {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href="/app/future/plans/new"
        className="ui-btn-primary ui-btn-sm !w-auto"
      >
        新建计划
      </Link>
      <Link href="/app/future/daily" className="ui-btn-ghost ui-btn-sm">
        每日打卡
      </Link>
      <Link href="/app/future/cycles" className="ui-btn-ghost ui-btn-sm">
        周期计划
      </Link>
      <Link href="/app/future/capsule" className="ui-btn-ghost ui-btn-sm">
        时间胶囊
      </Link>
    </div>
  );
}
