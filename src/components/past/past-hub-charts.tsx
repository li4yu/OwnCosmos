import Link from "next/link";
import { DensityRangePanel } from "@/components/past/density-range-panel";
import { MoodBars } from "@/components/mood/mood-bars";
import type { PastHubSnapshot } from "@/services/review";

type PastHubChartsProps = {
  snapshot: PastHubSnapshot;
};

/** 昔时往枢纽 · 三图摘要（密度 / 类型 / 情绪标记） */
export function PastHubCharts({ snapshot }: PastHubChartsProps) {
  const { total, last7Days, last30Days, last12Months, byType, byMood } =
    snapshot;
  const typeTotal = byType.reduce((s, t) => s + t.count, 0) || 1;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          沉淀一览
        </p>
        <p className="font-mono text-[10px] text-[var(--mist)]">
          馆藏合计 {total} 条
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <DensityRangePanel
          last7Days={last7Days}
          last30Days={last30Days}
          last12Months={last12Months}
        />

        <article className="flex h-full min-h-[14rem] flex-col rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs tracking-[0.1em] text-[var(--paper)]">
              馆藏类型
            </h3>
            <Link
              href="/app/past/gallery"
              className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
            >
              馆藏 →
            </Link>
          </div>
          {byType.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--mist)]">
              类型占比将随归档出现。
            </p>
          ) : (
            <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
              {byType.map((t) => (
                <li key={t.type} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="truncate text-[var(--paper)]">
                      {t.label}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-[var(--mist)]">
                      {t.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-sm bg-[var(--line)]/50">
                    <div
                      className="h-full rounded-sm bg-[var(--amber)]/55"
                      style={{
                        width: `${Math.max(6, (t.count / typeTotal) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="flex h-full min-h-[14rem] flex-col rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs tracking-[0.1em] text-[var(--paper)]">
              情绪标记分布
            </h3>
            <Link
              href="/app/past/mood"
              className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
            >
              情绪复盘 →
            </Link>
          </div>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5">
            <MoodBars
              items={byMood}
              emptyHint="尚无情绪标记；归档时可选，或在馆藏详情补改。"
            />
          </div>
        </article>
      </div>
    </section>
  );
}
