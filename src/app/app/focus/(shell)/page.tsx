import Link from "next/link";
import { ModuleHubCards } from "@/components/shell/module-shell";
import { PageHeader } from "@/components/shell/page-header";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { requireSession } from "@/lib/session";
import { getFocusShortStats } from "@/services/focus";

export default async function FocusHubPage() {
  const session = await requireSession();
  const stats = await getFocusShortStats(session.user.id);

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="凝时"
        eyebrow="FOCUS"
        description="顺钟累计、逆漏限时；完整结束后的凝录沉淀进昔时往"
      />

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          短统计
        </p>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
          <div className="rounded border border-[var(--line)] px-2.5 py-2">
            <p className="text-[10px] text-[var(--mist)]">今日已完成</p>
            <p className="mt-0.5 text-sm text-[var(--paper)]">
              {formatFocusDurationMs(stats.todayMs)}
            </p>
            <p className="font-mono text-[10px] text-[var(--mist)]">
              {stats.todayCount} 次
            </p>
          </div>
          <div className="rounded border border-[var(--line)] px-2.5 py-2">
            <p className="text-[10px] text-[var(--mist)]">本周已完成</p>
            <p className="mt-0.5 text-sm text-[var(--paper)]">
              {formatFocusDurationMs(stats.weekMs)}
            </p>
            <p className="font-mono text-[10px] text-[var(--mist)]">
              {stats.weekCount} 次
            </p>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--mist)]">
          仅统计完整结束的会话；进行中不计。周起点为周一。
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link href="/app/focus/forward" className="ui-btn-primary ui-btn-sm">
            开顺钟
          </Link>
          <Link href="/app/focus/countdown" className="ui-btn-ghost ui-btn-sm">
            开逆漏
          </Link>
        </div>
      </section>

      <ModuleHubCards moduleId="focus" />
    </main>
  );
}
