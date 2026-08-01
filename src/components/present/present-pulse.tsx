import Link from "next/link";

export type PresentPulseStats = {
  essayCount: number;
  dueCount: number;
  nearIdleCount: number;
};

type PresentPulseProps = {
  stats: PresentPulseStats;
};

/** 今时际 · 此刻摘要条 */
export function PresentPulse({ stats }: PresentPulseProps) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2">
      <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
        此刻摘要
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <li>
          <Link
            href="/app/present/essays"
            className="ui-hover-link text-[var(--mist)]"
          >
            流动中{" "}
            <span className="font-mono text-[var(--paper)]">
              {stats.essayCount}
            </span>{" "}
            篇
          </Link>
        </li>
        <li>
          <Link
            href="/app/present/due"
            className="ui-hover-link text-[var(--mist)]"
          >
            临期内{" "}
            <span className="font-mono text-[var(--paper)]">
              {stats.dueCount}
            </span>{" "}
            条
          </Link>
        </li>
        <li className="text-[var(--mist)]">
          近逾时沉淀{" "}
          <span
            className={`font-mono ${
              stats.nearIdleCount > 0
                ? "text-[var(--amber)]"
                : "text-[var(--paper)]"
            }`}
          >
            {stats.nearIdleCount}
          </span>{" "}
          篇
        </li>
      </ul>
    </section>
  );
}
