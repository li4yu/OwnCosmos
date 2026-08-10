import { IconActionLink } from "@/components/ui/icon-action";
import { IconChevronRight } from "@/components/ui/icon-glyphs";
import { formatFocusDurationMs } from "@/lib/focus-duration";

export type FocusPulseStats = {
  todayMs: number;
  todayCount: number;
  weekMs: number;
  weekCount: number;
  hasActive: boolean;
};

type FocusPulseProps = {
  stats: FocusPulseStats;
};

/** 凝时 · 专注摘要（含今日/本周占比条） */
export function FocusPulse({ stats }: FocusPulseProps) {
  const weekMax = Math.max(stats.weekMs, stats.todayMs, 1);
  const todayPct = Math.round((stats.todayMs / weekMax) * 100);
  const weekPct = 100;

  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--teal)]">
          专注摘要
        </p>
        {stats.hasActive ? (
          <IconActionLink
            href="/app/focus/forward"
            label="回到计时"
            className="oc-icon-action--accent"
          >
            <IconChevronRight size={14} />
          </IconActionLink>
        ) : null}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--mist)]">
        <li>
          今日{" "}
          <span className="font-mono text-[var(--paper)]">
            {formatFocusDurationMs(stats.todayMs)}
          </span>
          <span className="ml-1 font-mono text-xs">
            · {stats.todayCount} 次
          </span>
        </li>
        <li>
          本周{" "}
          <span className="font-mono text-[var(--paper)]">
            {formatFocusDurationMs(stats.weekMs)}
          </span>
          <span className="ml-1 font-mono text-xs">
            · {stats.weekCount} 次
          </span>
        </li>
      </ul>
      <div className="mt-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0 font-mono text-xs text-[var(--mist)]">
            今日
          </span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-[var(--line)]/50">
            <div
              className="ui-hover-bar h-full rounded-sm bg-[var(--amber)]/65"
              style={{ width: `${Math.max(stats.todayMs > 0 ? 8 : 0, todayPct)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0 font-mono text-xs text-[var(--mist)]">
            本周
          </span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-[var(--line)]/50">
            <div
              className="ui-hover-bar h-full rounded-sm bg-[var(--teal)]/65"
              style={{
                width: `${stats.weekMs > 0 ? weekPct : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-[var(--mist)]">
        仅完整结束的会话；周起点为周一
      </p>
    </section>
  );
}
