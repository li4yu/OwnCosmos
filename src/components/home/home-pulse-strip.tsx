"use client";

import { useState } from "react";
import Link from "next/link";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import type { HomeCheckinDay, HomeFocusDay } from "@/services/home-pulse";

type HomePulseStripProps = {
  checkinDays: HomeCheckinDay[];
  focusDays: HomeFocusDay[];
};

type MixSlice = {
  key: string;
  label: string;
  value: number;
  tone: "habit" | "cycle" | "focus";
};

/** 首页动态：笺墨线形——细茎、墨迹折线、比例墨条（非仪表盘饼柱） */
export function HomePulseStrip({
  checkinDays,
  focusDays,
}: HomePulseStripProps) {
  const [checkinTip, setCheckinTip] = useState<string | null>(null);
  const [focusTip, setFocusTip] = useState<string | null>(null);
  const [mixTip, setMixTip] = useState<string | null>(null);

  const habitTotal = checkinDays.reduce((s, d) => s + d.habitCount, 0);
  const cycleTotal = checkinDays.reduce((s, d) => s + d.cycleCount, 0);
  const checkinTotal = habitTotal + cycleTotal;
  const focusTotalMs = focusDays.reduce((s, d) => s + d.ms, 0);
  const focusTotalCount = focusDays.reduce((s, d) => s + d.count, 0);

  const mixSlices: MixSlice[] = [
    { key: "habit", label: "每日打卡", value: habitTotal, tone: "habit" },
    { key: "cycle", label: "周期计划", value: cycleTotal, tone: "cycle" },
    { key: "focus", label: "凝时", value: focusTotalCount, tone: "focus" },
  ];

  return (
    <section className="home-v1__pulse" aria-label="今日动态">
      <div className="home-v1__pulse-block">
        <div className="home-v1__pulse-head">
          <p className="home-v1__pulse-label">近七日打卡</p>
          <Link
            href="/app/future/daily"
            className="ui-hover-link-accent font-mono text-xs text-[var(--amber)]"
          >
            每日打卡 →
          </Link>
        </div>
        <CheckinInkChart days={checkinDays} onTip={setCheckinTip} />
        <p className="home-v1__pulse-foot">
          {checkinTip ?? (
            <>
              <span className="home-v1__pulse-legend">
                <i className="home-v1__pulse-swatch home-v1__pulse-swatch--habit" />
                每日打卡
              </span>
              <span className="home-v1__pulse-legend">
                <i className="home-v1__pulse-swatch home-v1__pulse-swatch--cycle" />
                周期计划
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
            className="ui-hover-link-accent font-mono text-xs text-[var(--amber)]"
          >
            凝时 →
          </Link>
        </div>
        <FocusInkChart days={focusDays} onTip={setFocusTip} />
        <p className="home-v1__pulse-foot">
          {focusTip ??
            `合计 ${formatFocusDurationMs(focusTotalMs)} · ${focusTotalCount} 次`}
        </p>
      </div>

      <div className="home-v1__pulse-block home-v1__pulse-block--mix">
        <div className="home-v1__pulse-head">
          <p className="home-v1__pulse-label">近七日构成</p>
          <span className="font-mono text-xs text-[var(--mist)]">次数</span>
        </div>
        <CompositionInkBar slices={mixSlices} onTip={setMixTip} />
        <p className="home-v1__pulse-foot">
          {mixTip ?? (
            <>
              {mixSlices.map((s) => (
                <span key={s.key} className="home-v1__pulse-legend">
                  <i
                    className={`home-v1__pulse-swatch home-v1__pulse-swatch--${s.tone}`}
                  />
                  {s.label} {s.value}
                </span>
              ))}
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function CheckinInkChart({
  days,
  onTip,
}: {
  days: HomeCheckinDay[];
  onTip: (t: string | null) => void;
}) {
  const max = Math.max(1, ...days.map((d) => d.habitCount + d.cycleCount));
  const w = 280;
  const h = 100;
  const padX = 10;
  const padTop = 8;
  const padBot = 22;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBot;
  const n = Math.max(1, days.length - 1);
  const gap = 3;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="home-v1__pulse-svg home-v1__pulse-svg--lg"
      role="img"
      aria-label="近七日每日打卡与周期计划打卡"
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
          total === 0 ? 0 : Math.max(6, (total / max) * (innerH - 4));
        const habitH =
          total === 0 ? 0 : (d.habitCount / Math.max(total, 1)) * totalH;
        const cycleH = totalH - habitH;
        const baseY = padTop + innerH;
        return (
          <g
            key={d.key}
            className="home-v1__pulse-stem"
            onMouseEnter={() =>
              onTip(`${d.label} · 每日打卡 ${d.habitCount} · 周期计划 ${d.cycleCount}`)
            }
            onMouseLeave={() => onTip(null)}
          >
            <rect
              x={x - 14}
              y={padTop}
              width={28}
              height={innerH + padBot}
              fill="transparent"
            />
            {total === 0 ? (
              <line
                x1={x - 3}
                y1={baseY}
                x2={x + 3}
                y2={baseY}
                className="home-v1__pulse-tick-empty"
              />
            ) : (
              <>
                {habitH > 0 ? (
                  <line
                    x1={x - gap}
                    y1={baseY}
                    x2={x - gap}
                    y2={baseY - habitH}
                    className="home-v1__pulse-ink home-v1__pulse-ink--habit"
                  />
                ) : null}
                {cycleH > 0 ? (
                  <line
                    x1={x + gap}
                    y1={baseY}
                    x2={x + gap}
                    y2={baseY - cycleH}
                    className="home-v1__pulse-ink home-v1__pulse-ink--cycle"
                  />
                ) : null}
              </>
            )}
            <text
              x={x}
              y={h - 4}
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

function FocusInkChart({
  days,
  onTip,
}: {
  days: HomeFocusDay[];
  onTip: (t: string | null) => void;
}) {
  const maxMs = Math.max(1, ...days.map((d) => d.ms));
  const w = 280;
  const h = 100;
  const padX = 10;
  const padTop = 10;
  const padBot = 22;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBot;
  const n = Math.max(1, days.length - 1);

  const points = days.map((d, i) => {
    const x = padX + (i / n) * innerW;
    const y =
      d.ms === 0
        ? padTop + innerH
        : padTop + innerH - (d.ms / maxMs) * (innerH - 4);
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

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
      <path d={pathD} fill="none" className="home-v1__pulse-line" />
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
          {p.ms > 0 ? (
            <circle
              cx={p.x}
              cy={p.y}
              r={3.2}
              className="home-v1__pulse-node"
            />
          ) : (
            <line
              x1={p.x - 3}
              y1={p.y}
              x2={p.x + 3}
              y2={p.y}
              className="home-v1__pulse-tick-empty"
            />
          )}
          <text
            x={p.x}
            y={h - 4}
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

function CompositionInkBar({
  slices,
  onTip,
}: {
  slices: MixSlice[];
  onTip: (t: string | null) => void;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    return (
      <div className="home-v1__pulse-mix" aria-label="近七日构成（暂无）">
        <div className="home-v1__pulse-mix-track home-v1__pulse-mix-track--empty" />
        <p className="home-v1__pulse-mix-total">暂无</p>
      </div>
    );
  }

  return (
    <div className="home-v1__pulse-mix" aria-label="近七日每日打卡、周期计划与凝时次数构成">
      <p className="home-v1__pulse-mix-total">
        <span className="home-v1__pulse-mix-num">{total}</span>
        <span className="home-v1__pulse-mix-unit">次</span>
      </p>
      <div className="home-v1__pulse-mix-track" role="img">
        {slices
          .filter((s) => s.value > 0)
          .map((s) => {
            const pct = Math.round((s.value / total) * 100);
            return (
              <button
                key={s.key}
                type="button"
                className={`home-v1__pulse-mix-seg home-v1__pulse-mix-seg--${s.tone}`}
                style={{ flexGrow: s.value, flexBasis: 0 }}
                onMouseEnter={() => onTip(`${s.label} ${s.value} 次 · ${pct}%`)}
                onMouseLeave={() => onTip(null)}
                aria-label={`${s.label} ${s.value} 次`}
              />
            );
          })}
      </div>
      <ul className="home-v1__pulse-mix-rows">
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.key}>
              <button
                type="button"
                className="home-v1__pulse-mix-row"
                onMouseEnter={() =>
                  onTip(`${s.label} ${s.value} 次 · ${pct}%`)
                }
                onMouseLeave={() => onTip(null)}
              >
                <span className="home-v1__pulse-mix-row-name">
                  <i
                    className={`home-v1__pulse-swatch home-v1__pulse-swatch--${s.tone}`}
                  />
                  {s.label}
                </span>
                <span className="home-v1__pulse-mix-row-val">
                  {s.value}
                  <em>{pct}%</em>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
