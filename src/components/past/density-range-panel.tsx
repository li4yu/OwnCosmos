"use client";

import { useState } from "react";
import Link from "next/link";
import type { DensityPoint } from "@/services/review";

export type DensityRange = "7d" | "30d" | "1y";

type DensityRangePanelProps = {
  last7Days: DensityPoint[];
  last30Days: DensityPoint[];
  last12Months: DensityPoint[];
};

const RANGES: { id: DensityRange; label: string }[] = [
  { id: "7d", label: "近七天" },
  { id: "30d", label: "近一月" },
  { id: "1y", label: "近一年" },
];

/** 归档密度：近七天 / 近一月 / 近一年（柱状，铺满卡片） */
export function DensityRangePanel({
  last7Days,
  last30Days,
  last12Months,
}: DensityRangePanelProps) {
  const [range, setRange] = useState<DensityRange>("7d");
  const [tip, setTip] = useState<string | null>(null);
  const points =
    range === "7d"
      ? last7Days
      : range === "30d"
        ? last30Days
        : last12Months;
  const sum = points.reduce((s, p) => s + p.count, 0);
  const max = Math.max(1, ...points.map((p) => p.count));
  const axisHint = range === "1y" ? "横轴：月" : "横轴：日";
  const showEveryLabel = range === "7d" || range === "1y";

  return (
    <article className="flex h-full min-h-[14rem] flex-col rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5">
        <h3 className="text-xs tracking-[0.1em] text-[var(--paper)]">
          归档密度
        </h3>
        <Link
          href="/app/past/corridor"
          className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
        >
          时间线 →
        </Link>
      </div>

      <div className="mt-1.5 flex shrink-0 gap-0.5">
        {RANGES.map((r) => {
          const active = range === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setRange(r.id);
                setTip(null);
              }}
              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                active
                  ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--amber)]"
                  : "ui-hover-chip border-transparent text-[var(--mist)]"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {sum === 0 ? (
        <p className="mt-2 flex-1 text-xs text-[var(--mist)]">
          该时段尚无归档。
        </p>
      ) : (
        <div
          className="mt-2 flex min-h-0 flex-1 items-end gap-0.5"
          role="img"
          aria-label={`${RANGES.find((r) => r.id === range)?.label ?? ""}归档密度柱状图`}
        >
          {points.map((p, i) => {
            const pct =
              p.count === 0 ? 4 : Math.max(8, Math.round((p.count / max) * 100));
            const showLabel =
              showEveryLabel ||
              i === 0 ||
              i === points.length - 1 ||
              i % 7 === 0;
            const tipText = `${p.label} · ${p.count} 条`;
            return (
              <button
                key={p.key}
                type="button"
                className="group flex h-full min-w-0 flex-1 cursor-default flex-col items-stretch justify-end gap-0.5 border-0 bg-transparent p-0"
                onMouseEnter={() => setTip(tipText)}
                onMouseLeave={() => setTip(null)}
                aria-label={tipText}
              >
                <div className="flex min-h-0 flex-1 items-end">
                  <span
                    className="ui-hover-bar block w-full rounded-sm"
                    style={{
                      height: `${pct}%`,
                      ["--ui-bar" as string]:
                        p.count > 0
                          ? "color-mix(in srgb, var(--teal) 70%, transparent)"
                          : "color-mix(in srgb, var(--line) 55%, transparent)",
                    }}
                  />
                </div>
                {showLabel ? (
                  <span className="truncate text-center font-mono text-[7px] leading-none text-[var(--mist)] transition group-hover:text-[var(--amber)]">
                    {range === "1y"
                      ? p.label.replace("月", "")
                      : (p.label.split("/")[1] ?? p.label)}
                  </span>
                ) : (
                  <span className="h-2 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-1 shrink-0 font-mono text-[9px] text-[var(--mist)]">
        {tip ?? `${axisHint} · 合计 ${sum}`}
      </p>
    </article>
  );
}
