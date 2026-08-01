import Link from "next/link";
import { AnniversaryToggle } from "@/components/corridor/anniversary-toggle";
import { YearAxis } from "@/components/corridor/year-axis";
import { PageHeader } from "@/components/shell/page-header";
import { archiveTypeLabel } from "@/lib/archive-labels";
import { moodDisplay } from "@/lib/moods";
import { requireSession } from "@/lib/session";
import {
  getArchiveDensityByYearMonth,
  listAnniversaryHits,
  listArchiveTitlesInMonth,
} from "@/services/review";

type Props = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

export default async function PastCorridorPage({ searchParams }: Props) {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    anniversaryRemind?: boolean;
  };
  const sp = await searchParams;
  const year = sp.year ? Number.parseInt(sp.year, 10) : undefined;
  const month = sp.month ? Number.parseInt(sp.month, 10) : undefined;
  const validYear = year != null && Number.isFinite(year) ? year : undefined;
  const validMonth =
    month != null && month >= 1 && month <= 12 ? month : undefined;

  const [density, anniversaryHits, monthItems] = await Promise.all([
    getArchiveDensityByYearMonth(session.user.id),
    listAnniversaryHits(session.user.id),
    validYear != null && validMonth != null
      ? listArchiveTitlesInMonth(session.user.id, validYear, validMonth)
      : Promise.resolve([]),
  ]);

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="往迹廊"
        eyebrow="CORRIDOR"
        description="以时间为线索回看归档密度；可开启同年回望"
        backHref="/app/past"
        backLabel="返回昔时往"
      />

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
        <AnniversaryToggle
          initialEnabled={Boolean(user.anniversaryRemind)}
        />
        {anniversaryHits.length > 0 ? (
          <div className="mt-3 border-t border-[var(--line)] pt-2">
            <p className="font-mono text-[10px] text-[var(--mist)]">
              往年今日 · {anniversaryHits.length} 条
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {anniversaryHits.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/app/past/gallery/${h.id}`}
                    className="text-xs text-[var(--amber)] hover:underline"
                  >
                    {h.year} · {h.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--mist)]/80">
            往年今日暂无归档痕迹。
          </p>
        )}
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          岁轴
        </p>
        <p className="mt-0.5 mb-3 text-xs text-[var(--mist)]">
          点击月份查看该月条目
        </p>
        <YearAxis
          density={density}
          selectedYear={validYear}
          selectedMonth={validMonth}
        />
      </section>

      {validYear != null && validMonth != null ? (
        <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
              {validYear} 年 {validMonth} 月
            </p>
            <Link
              href="/app/past/corridor"
              className="ui-hover-link font-mono text-[10px] text-[var(--mist)]"
            >
              清除筛选
            </Link>
          </div>
          {monthItems.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--mist)]">该月无条目。</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {monthItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/app/past/gallery/${item.id}`}
                    className="ui-hover-card flex flex-wrap items-baseline justify-between gap-2 rounded border border-[var(--line)] px-2 py-1.5 text-xs"
                  >
                    <span className="text-[var(--paper)]">{item.title}</span>
                    <span className="font-mono text-[10px] text-[var(--mist)]">
                      {archiveTypeLabel(item.type)}
                      {item.mood ? ` · ${moodDisplay(item.mood)}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
