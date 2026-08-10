import type { MoodTagPair, YearBrief } from "@/services/review";
import { MoodBars } from "@/components/mood/mood-bars";

type YearBriefPanelProps = {
  brief: YearBrief;
  pairs: MoodTagPair[];
};

/** 年度摘要 + 情绪共现（结构化，无模型文案） */
export function YearBriefPanel({ brief, pairs }: YearBriefPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          年度摘要 · {brief.year}
        </p>
        <p className="mt-1 text-xs text-[var(--mist)]">
          规则汇总，不含生成文案
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded border border-[var(--line)] px-2 py-1.5">
            <dt className="font-mono text-[10px] text-[var(--mist)]">归档</dt>
            <dd className="mt-0.5 text-lg text-[var(--paper)]">{brief.total}</dd>
          </div>
          <div className="rounded border border-[var(--line)] px-2 py-1.5">
            <dt className="font-mono text-[10px] text-[var(--mist)]">有情绪标记</dt>
            <dd className="mt-0.5 text-lg text-[var(--paper)]">
              {brief.withMood}
            </dd>
          </div>
          <div className="rounded border border-[var(--line)] px-2 py-1.5">
            <dt className="font-mono text-[10px] text-[var(--mist)]">类型种数</dt>
            <dd className="mt-0.5 text-lg text-[var(--paper)]">
              {brief.byType.length}
            </dd>
          </div>
          <div className="rounded border border-[var(--line)] px-2 py-1.5">
            <dt className="font-mono text-[10px] text-[var(--mist)]">标签种数</dt>
            <dd className="mt-0.5 text-lg text-[var(--paper)]">
              {brief.topTags.length}
            </dd>
          </div>
        </dl>

        {brief.byType.length > 0 ? (
          <div className="mt-3">
            <p className="font-mono text-[10px] tracking-wide text-[var(--mist)]">
              按类型
            </p>
            <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {brief.byType.map((t) => (
                <li
                  key={t.type}
                  className="rounded border border-[var(--line)] px-2 py-0.5 text-[var(--paper)]"
                >
                  {t.label} · {t.count}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {brief.topTags.length > 0 ? (
          <div className="mt-3">
            <p className="font-mono text-[10px] tracking-wide text-[var(--mist)]">
              高频标签
            </p>
            <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {brief.topTags.map((t) => (
                <li
                  key={t.name}
                  className="rounded border border-[var(--line)] px-2 py-0.5 text-[var(--mist)]"
                >
                  {t.name} · {t.count}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[10px] tracking-wide text-[var(--mist)]">
            当年情绪分布
          </p>
          <MoodBars
            items={brief.byMood}
            emptyHint="该年尚无情绪标记数据。"
          />
        </div>
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          情绪共现 · 情绪 × 主题
        </p>
        <p className="mt-1 text-xs text-[var(--mist)]">
          共现次数统计（有情绪标记且带标签的馆藏）
        </p>
        {pairs.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--mist)]">
            暂无共现。给馆藏补情绪标记与标签后会出现在这里。
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {pairs.map((p) => (
              <li
                key={`${p.mood}-${p.tagName}`}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-[var(--line)] px-2 py-1 text-xs"
              >
                <span className="text-[var(--paper)]">
                  {p.moodLabel}
                  <span className="mx-1 text-[var(--mist)]">×</span>
                  {p.tagName}
                </span>
                <span className="font-mono text-[10px] text-[var(--mist)]">
                  {p.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
