import Link from "next/link";

export type FuturePulseStats = {
  planCount: number;
  cycleCount: number;
  habitCount: number;
  capsuleCount: number;
  unlockReadyCount: number;
};

type FuturePulseProps = {
  stats: FuturePulseStats;
};

/** 来日途 · 前路摘要 */
export function FuturePulse({ stats }: FuturePulseProps) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2">
      <p className="font-mono text-xs tracking-[0.16em] text-[var(--teal)]">
        前路摘要
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <li>
          <Link
            href="/app/future/plans"
            className="ui-hover-link text-[var(--mist)]"
          >
            规划{" "}
            <span className="font-mono text-[var(--paper)]">
              {stats.planCount}
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/app/future/cycles"
            className="ui-hover-link text-[var(--mist)]"
          >
            周期计划{" "}
            <span className="font-mono text-[var(--paper)]">
              {stats.cycleCount}
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/app/future/daily"
            className="ui-hover-link text-[var(--mist)]"
          >
            每日打卡{" "}
            <span className="font-mono text-[var(--paper)]">
              {stats.habitCount}
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/app/future/capsule"
            className="ui-hover-link text-[var(--mist)]"
          >
            胶囊{" "}
            <span className="font-mono text-[var(--paper)]">
              {stats.capsuleCount}
            </span>
            {stats.unlockReadyCount > 0 ? (
              <span className="ml-1 font-mono text-[var(--amber)]">
                · 可开 {stats.unlockReadyCount}
              </span>
            ) : null}
          </Link>
        </li>
      </ul>
    </section>
  );
}
