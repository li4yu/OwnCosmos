import Link from "next/link";
import { formatDueDateInput } from "@/lib/plan-dates";

export type FutureCapsulePreviewItem = {
  id: string;
  title: string;
  dueAt: Date | null;
  unlockReady: boolean;
};

export type FutureCyclePreviewItem = {
  id: string;
  title: string;
  dueAt: Date | null;
};

type FutureSidePreviewProps = {
  capsules: FutureCapsulePreviewItem[];
  cycles: FutureCyclePreviewItem[];
};

/** 来日途 · 胶囊可开 + 轮期快览 */
export function FutureSidePreview({
  capsules,
  cycles,
}: FutureSidePreviewProps) {
  const ready = capsules.filter((c) => c.unlockReady);
  const locked = capsules.filter((c) => !c.unlockReady).slice(0, 3);

  return (
    <div className="flex flex-col gap-2">
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs tracking-[0.1em] text-[var(--paper)]">
            时间胶囊
          </h3>
          <Link
            href="/app/future/capsule"
            className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
          >
            全部 →
          </Link>
        </div>
        {capsules.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--mist)]">
            尚无胶囊。写给未来的自己，到日再开。
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {ready.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/future/plans/${c.id}`}
                  className="ui-hover-card block rounded border border-[var(--amber)]/40 bg-[var(--amber)]/5 px-2 py-1.5"
                >
                  <span className="text-xs text-[var(--paper)]">{c.title}</span>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--amber)]">
                    可开启
                  </p>
                </Link>
              </li>
            ))}
            {locked.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/future/plans/${c.id}`}
                  className="ui-hover-card block rounded border border-[var(--line)] px-2 py-1.5"
                >
                  <span className="text-xs text-[var(--mist)]">{c.title}</span>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--mist)]">
                    {c.dueAt
                      ? `解锁 ${formatDueDateInput(c.dueAt)}`
                      : "待设定"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs tracking-[0.1em] text-[var(--paper)]">
            进行中轮期
          </h3>
          <Link
            href="/app/future/cycles"
            className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
          >
            全部 →
          </Link>
        </div>
        {cycles.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--mist)]">暂无轮期。</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {cycles.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/future/plans/${c.id}`}
                  className="ui-hover-card block rounded border border-[var(--line)] px-2 py-1.5 text-xs text-[var(--paper)]"
                >
                  {c.title}
                  {c.dueAt ? (
                    <span className="ml-2 font-mono text-[9px] text-[var(--mist)]">
                      本期 {formatDueDateInput(c.dueAt)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
