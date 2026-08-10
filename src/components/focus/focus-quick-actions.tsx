import Link from "next/link";

/** 凝时 · 快捷入口 */
export function FocusQuickActions() {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href="/app/focus/forward"
        className="ui-btn-primary ui-btn-sm !w-auto"
      >
        正向计时
      </Link>
      <Link href="/app/focus/countdown" className="ui-btn-ghost ui-btn-sm">
        倒计时
      </Link>
      <Link href="/app/focus/records" className="ui-btn-ghost ui-btn-sm">
        专注记录
      </Link>
    </div>
  );
}
