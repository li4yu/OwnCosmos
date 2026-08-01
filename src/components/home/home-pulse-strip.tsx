"use client";

import { useState } from "react";
import Link from "next/link";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import type { HomeCheckinDay, HomeFocusDay } from "@/services/home-pulse";

type HomePulseStripProps = {
  checkinDays: HomeCheckinDay[];
  focusDays: HomeFocusDay[];
};

type PieSlice = {
  key: string;
  label: string;
  value: number;
  className: string;
};

/** 首页脉搏：打卡柱 + 凝时折线 + 构成饼图 */
export function HomePulseStrip({
  checkinDays,
  focusDays,
}: HomePulseStripProps) {
  const [checkinTip, setCheckinTip] = useState<string | null>(null);
  const [focusTip, setFocusTip] = useState<string | null>(null);
  const [pieTip, setPieTip] = useState<string | null>(null);

  const habitTotal = checkinDays.reduce((s, d) => s + d.habitCount, 0);
  const cycleTotal = checkinDays.reduce((s, d) => s + d.cycleCount, 0);
  const checkinTotal = habitTotal + cycleTotal;
  const focusTotalMs = focusDays.reduce((s, d) => s + d.ms, 0);
  const focusTotalCount = focusDays.reduce((s, d) => s + d.count, 0);

  const pieSlices: PieSlice[] = [
    {
      key: "habit",
      label: "日课",
      value: habitTotal,
      className: "home-v1__pulse-pie--habit",
    },
    {
      key: "cycle",
      label: "轮期",
      value: cycleTotal,
      className: "home-v1__pulse-pie--cycle",
    },
    {
      key: "focus",
      label: "凝时",
      value: focusTotalCount,
      className: "home-v1__pulse-pie--focus",
    },
  ];

  return (
    <section className="home-v1__pulse" aria-label="今日脉搏">
      <div className="home-v1__pulse-block">
        <div className="home-v1__pulse-head">
          <p className="home-v1__pulse-label">近七日打卡</p>
          <Link
            href="/app/future/daily"
            className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
          >
            日课 →
          </Link>
        </div>
        <CheckinStemChart days={checkinDays} onTip={setCheckinTip} />
        <p className="home-v1__pulse-foot">
          {checkinTip ?? (
            <>
              <span className="home-v1__pulse-legend">
                <i className="home-v1__pulse-swatch home-v1__pulse-swatch--habit" />
                日课
              </span>
              <span className="home-v1__pulse-legend">
                <i className="home-v1__pulse-swatch home-v1__pulse-swatch--cycle" />
                轮期
              </span>
              <span className="font-mono">合计 {checkinTotal}</span>
            </>
          )}
        </p>
      </div>

      <div className="home-v1__pulse-block">
        <div className="home-v1__pulse-head">
          <p className="home-v1__pulse-label">近七日凝时</p>
          <Link
            href="/app/focus"
            className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
          >
            凝时 →
          </Link>
        </div>
        <FocusLineChart days={focusDays} onTip={setFocusTip} />
        <p className="home-v1__pulse-foot">
          {focusTip ??
            `合计 ${formatFocusDurationMs(focusTotalMs)} · ${focusTotalCount} 次`}
        </p>
      </div>

      <div className="home-v1__pulse-block home-v1__pulse-block--pie">
        <div className="home-v1__pulse-head">
          <p className="home-v1__pulse-label">近七日构成</p>
          <span className="font-mono text-[9px] text-[var(--mist)]">次数</span>
        </div>
        <CompositionPie slices={pieSlices} onTip={setPieTip} />
        <p className="home-v1__pulse-foot">
          {pieTip ?? (
            <>
              <span className="home-v1__pulse-legend">
                <i className="home-v1__pulse-swatch home-v1__pulse-swatch--habit" />
                日课 {habitTotal}
              </span>
              <span className="home-v1__pulse-legend">
                <i className="home-v1__pulse-swatch home-v1__pulse-swatch--cycle" />
                轮期 {cycleTotal}
              </span>
              <span className="home-v1__pulse-legend">
                <i className="home-v1__pulse-swatch home-v1__pulse-swatch--focus" />
                凝时 {focusTotalCount}
              </span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function CheckinStemChart({
  days,
  onTip,
}: {
  days: HomeCheckinDay[];
  onTip: (t: string | null) => void;
}) {
  const max = Math.max(1, ...days.map((d) => d.habitCount + d.cycleCount));
  const w = 280;
  const h = 96;
  const padX = 14;
  const padTop = 10;
  const padBot = 18;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBot;
  const n = Math.max(1, days.length - 1);
  const barW = 10;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="home-v1__pulse-svg home-v1__pulse-svg--lg"
      role="img"
      aria-label="近七日日课与轮期打卡"
    >
      <line
        x1={padX}
        y1={padTop + innerH}
        x2={padX + innerW}
        y2={padTop + innerH}
        className="home-v1__pulse-axis"
      />
      {days.map((d, i) => {
        const x = padX + (i / n) * innerW;
        const total = d.habitCount + d.cycleCount;
        const totalH =
          total === 0 ? 0 : Math.max(8, (total / max) * (innerH - 2));
        const habitH =
          total === 0 ? 0 : (d.habitCount / Math.max(total, 1)) * totalH;
        const cycleH = totalH - habitH;
        const baseY = padTop + innerH;
        return (
          <g
            key={d.key}
            className="home-v1__pulse-stem"
            onMouseEnter={() =>
              onTip(`${d.label} · 日课 ${d.habitCount} · 轮期 ${d.cycleCount}`)
            }
            onMouseLeave={() => onTip(null)}
          >
            <rect
              x={x - 12}
              y={padTop}
              width={24}
              height={innerH + padBot}
              fill="transparent"
            />
            {total === 0 ? (
              <circle
                cx={x}
                cy={baseY - 3}
                r={2.5}
                className="home-v1__pulse-dot-empty"
              />
            ) : (
              <>
                {cycleH > 0 ? (
                  <rect
                    x={x - barW / 2}
                    y={baseY - totalH}
                    width={barW}
                    height={cycleH}
                    rx={2}
                    className="home-v1__pulse-stem-cycle"
                  />
                ) : null}
                {habitH > 0 ? (
                  <rect
                    x={x - barW / 2}
                    y={baseY - habitH}
                    width={barW}
                    height={habitH}
                    rx={2}
                    className="home-v1__pulse-stem-habit"
                  />
                ) : null}
              </>
            )}
            <text
              x={x}
              y={h - 3}
              textAnchor="middle"
              className="home-v1__pulse-svg-tick"
            >
              {d.label.split("/")[1]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FocusLineChart({
  days,
  onTip,
}: {
  days: HomeFocusDay[];
  onTip: (t: string | null) => void;
}) {
  const maxMs = Math.max(1, ...days.map((d) => d.ms));
  const w = 280;
  const h = 96;
  const padX = 14;
  const padTop = 12;
  const padBot = 18;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBot;
  const n = Math.max(1, days.length - 1);

  const points = days.map((d, i) => {
    const x = padX + (i / n) * innerW;
    const y =
      d.ms === 0
        ? padTop + innerH
        : padTop + innerH - (d.ms / maxMs) * (innerH - 6);
    return { x, y, ...d };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${padX},${padTop + innerH} ${line} ${padX + innerW},${padTop + innerH}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="home-v1__pulse-svg home-v1__pulse-svg--lg"
      role="img"
      aria-label="近七日凝时时长"
    >
      <line
        x1={padX}
        y1={padTop + innerH}
        x2={padX + innerW}
        y2={padTop + innerH}
        className="home-v1__pulse-axis"
      />
      <polygon points={area} className="home-v1__pulse-area" />
      <polyline points={line} fill="none" className="home-v1__pulse-line" />
      {points.map((p) => (
        <g
          key={p.key}
          onMouseEnter={() =>
            onTip(
              `${p.label} · ${formatFocusDurationMs(p.ms)} · ${p.count} 次`,
            )
          }
          onMouseLeave={() => onTip(null)}
        >
          <circle
            cx={p.x}
            cy={p.y}
            r={p.ms > 0 ? 4 : 2.5}
            className={
              p.ms > 0 ? "home-v1__pulse-node" : "home-v1__pulse-dot-empty"
            }
          />
          <text
            x={p.x}
            y={h - 3}
            textAnchor="middle"
            className="home-v1__pulse-svg-tick"
          >
            {p.label.split("/")[1]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function CompositionPie({
  slices,
  onTip,
}: {
  slices: PieSlice[];
  onTip: (t: string | null) => void;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 44;
  const rInner = 24;

  if (total === 0) {
    return (
      <div className="home-v1__pulse-pie-wrap">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="home-v1__pulse-pie"
          role="img"
          aria-label="近七日构成（暂无）"
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            className="home-v1__pulse-pie-empty-ring"
          />
          <circle cx={cx} cy={cy} r={rInner} className="home-v1__pulse-pie-hole" />
          <text
            x={cx}
            y={cy + 3}
            textAnchor="middle"
            className="home-v1__pulse-pie-center"
          >
            暂无
          </text>
        </svg>
      </div>
    );
  }

  let angle = -Math.PI / 2;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total) * Math.PI * 2;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return { ...s, start, end, pct: Math.round((s.value / total) * 100) };
    });

  return (
    <div className="home-v1__pulse-pie-wrap">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="home-v1__pulse-pie"
        role="img"
        aria-label="近七日日课、轮期与凝时次数构成"
      >
        {arcs.map((s) => {
          const large = s.end - s.start > Math.PI ? 1 : 0;
          const x1 = cx + r * Math.cos(s.start);
          const y1 = cy + r * Math.sin(s.start);
          const x2 = cx + r * Math.cos(s.end);
          const y2 = cy + r * Math.sin(s.end);
          const xi1 = cx + rInner * Math.cos(s.end);
          const yi1 = cy + rInner * Math.sin(s.end);
          const xi2 = cx + rInner * Math.cos(s.start);
          const yi2 = cy + rInner * Math.sin(s.start);
          const d = [
            `M ${x1} ${y1}`,
            `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
            `L ${xi1} ${yi1}`,
            `A ${rInner} ${rInner} 0 ${large} 0 ${xi2} ${yi2}`,
            "Z",
          ].join(" ");
          return (
            <path
              key={s.key}
              d={d}
              className={`home-v1__pulse-pie-slice ${s.className}`}
              onMouseEnter={() =>
                onTip(`${s.label} ${s.value} 次 · ${s.pct}%`)
              }
              onMouseLeave={() => onTip(null)}
            />
          );
        })}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="home-v1__pulse-pie-center"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 11}
          textAnchor="middle"
          className="home-v1__pulse-pie-sub"
        >
          次
        </text>
      </svg>
    </div>
  );
}
