import Link from "next/link";

/** 今时际 · 快捷入口 */
export function PresentQuickActions() {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href="/app/present/essays/new"
        className="ui-btn-primary ui-btn-sm !w-auto"
      >
        每日随笔
      </Link>
      <Link
        href="/app/present/essays/topics"
        className="ui-btn-ghost ui-btn-sm"
      >
        专题随笔
      </Link>
      <Link
        href="/app/present/due"
        className="ui-btn-ghost ui-btn-sm"
      >
        临期帖
      </Link>
    </div>
  );
}
