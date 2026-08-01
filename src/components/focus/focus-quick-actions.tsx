import Link from "next/link";

/** 凝时 · 快捷入口 */
export function FocusQuickActions() {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href="/app/focus/forward"
        className="ui-btn-primary ui-btn-sm !w-auto"
      >
        开顺钟
      </Link>
      <Link href="/app/focus/countdown" className="ui-btn-ghost ui-btn-sm">
        开逆漏
      </Link>
      <Link href="/app/focus/records" className="ui-btn-ghost ui-btn-sm">
        凝录
      </Link>
    </div>
  );
}
