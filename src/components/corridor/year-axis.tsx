import Link from "next/link";
import type { YearMonthDensity } from "@/services/review";

type YearAxisProps = {
  density: YearMonthDensity[];
  selectedYear?: number;
  selectedMonth?: number;
};

type YearBlock = {
  year: number;
  months: { month: number; count: number }[];
  total: number;
};

function groupByYear(density: YearMonthDensity[]): YearBlock[] {
  const map = new Map<number, YearBlock>();
  for (const row of density) {
    let block = map.get(row.year);
    if (!block) {
      block = { year: row.year, months: [], total: 0 };
      map.set(row.year, block);
    }
    block.months.push({ month: row.month, count: row.count });
    block.total += row.count;
  }
  return [...map.values()].sort((a, b) => b.year - a.year);
}

/** 往迹廊 · 岁轴（年 / 月密度） */
export function YearAxis({
  density,
  selectedYear,
  selectedMonth,
}: YearAxisProps) {
  const years = groupByYear(density);
  const maxMonth = Math.max(1, ...density.map((d) => d.count));

  if (years.length === 0) {
    return (
      <p className="text-xs text-[var(--mist)]">
        尚无馆藏记录。随笔沉淀、规划归档等流入后，这里会按年月显示密度。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {years.map((block) => (
        <section key={block.year} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm tracking-[0.14em] text-[var(--paper)]">
              {block.year}
            </h3>
            <p className="font-mono text-[10px] text-[var(--mist)]">
              {block.total} 条
            </p>
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-12">
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const hit = block.months.find((m) => m.month === month);
              const count = hit?.count ?? 0;
              const ratio = count / maxMonth;
              const active =
                selectedYear === block.year && selectedMonth === month;
              return (
                <Link
                  key={month}
                  href={
                    count > 0
                      ? `/app/past/corridor?year=${block.year}&month=${month}`
                      : `/app/past/corridor?year=${block.year}`
                  }
                  className={`group flex flex-col gap-1 rounded border px-1.5 py-1.5 transition ${
                    active
                      ? "border-[var(--amber)] bg-[var(--amber)]/10"
                      : "ui-hover-card border-[var(--line)]"
                  }`}
                  title={`${block.year}-${String(month).padStart(2, "0")} · ${count} 条`}
                >
                  <span className="font-mono text-[9px] text-[var(--mist)]">
                    {month}月
                  </span>
                  <span
                    className="block h-8 w-full rounded-sm"
                    style={{
                      background: count
                        ? `color-mix(in srgb, var(--teal) ${Math.max(18, Math.round(ratio * 85))}%, transparent)`
                        : "color-mix(in srgb, var(--line) 40%, transparent)",
                    }}
                  />
                  <span className="font-mono text-[9px] text-[var(--paper)]/80">
                    {count || "·"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
