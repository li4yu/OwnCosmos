import Link from "next/link";
import { MoodBars } from "@/components/mood/mood-bars";
import { YearBriefPanel } from "@/components/mood/year-brief-panel";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";
import {
  getMoodSpectrum,
  getMoodTagCooccurrence,
  getYearBrief,
  listArchiveYears,
} from "@/services/review";

type Props = {
  searchParams: Promise<{ year?: string }>;
};

export default async function PastMoodPage({ searchParams }: Props) {
  const session = await requireSession();
  const sp = await searchParams;
  const years = await listArchiveYears(session.user.id);
  const currentYear = new Date().getFullYear();
  const parsed = sp.year ? Number.parseInt(sp.year, 10) : undefined;
  const year =
    parsed != null && Number.isFinite(parsed)
      ? parsed
      : (years[0] ?? currentYear);

  const [allMoods, brief, pairs] = await Promise.all([
    getMoodSpectrum(session.user.id),
    getYearBrief(session.user.id, year),
    getMoodTagCooccurrence(session.user.id, year),
  ]);

  const yearOptions =
    years.length > 0 ? years : [currentYear];

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="情绪复盘"
        eyebrow="MOOD"
        description="情绪分布、年度摘要与情绪共现——规则统计，无模型文案"
        backHref="/app/past"
        backLabel="返回昔时往"
      />

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          情绪分布 · 全部
        </p>
        <p className="mt-0.5 mb-2 text-xs text-[var(--mist)]">
          馆藏中带情绪标记的条目分布；可在详情页补改
        </p>
        <MoodBars items={allMoods} />
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
            年份
          </p>
          <div className="flex flex-wrap gap-1">
            {yearOptions.map((y) => {
              const active = y === year;
              return (
                <Link
                  key={y}
                  href={`/app/past/mood?year=${y}`}
                  className={`rounded border px-2 py-0.5 font-mono text-[11px] transition ${
                    active
                      ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--paper)]"
                      : "ui-hover-chip border-[var(--line)] text-[var(--mist)]"
                  }`}
                >
                  {y}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <YearBriefPanel brief={brief} pairs={pairs} />
    </main>
  );
}
