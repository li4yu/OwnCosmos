"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  completeFocusAction,
  createFocusEssayAction,
  pauseFocusAction,
  resumeFocusAction,
  startCountdownFocusAction,
  startForwardFocusAction,
} from "@/app/app/focus/actions";
import {
  FOCUS_MODE_COUNTDOWN,
  FOCUS_MODE_FORWARD,
  FOCUS_STATUS_PAUSED,
  FOCUS_STATUS_RUNNING,
} from "@/db/schema";
import { formatFocusClock } from "@/lib/focus-duration";
import { galleryDetailHref } from "@/lib/gallery-sections";
import {
  brightStarIndex,
  constellationForIndex,
  xiuAtElapsed,
} from "@/lib/xingxiu";
import {
  FocusBindPicker,
  type FocusBindPickerOption,
} from "@/components/focus/focus-bind-picker";
import { NoticeDialog } from "@/components/ui/notice-dialog";
import { PoeticName } from "@/components/ui/poetic-name";

type ActiveSnapshot = {
  id: string;
  status: string;
  mode: string;
  accumulatedMs: number;
  targetMs: number | null;
  planId: string | null;
  habitId: string | null;
  bindLabel: string | null;
  runningSince: string | null;
};

type FocusTimerProps = {
  /** 本页默认模式：顺钟 / 逆漏（已有进行中会话时以会话为准） */
  pageMode: typeof FOCUS_MODE_FORWARD | typeof FOCUS_MODE_COUNTDOWN;
  active: ActiveSnapshot | null;
  bindOptions: FocusBindPickerOption[];
};

const COUNTDOWN_PRESETS = [
  { label: "25 分", ms: 25 * 60_000 },
  { label: "45 分", ms: 45 * 60_000 },
  { label: "60 分", ms: 60 * 60_000 },
] as const;

function parseTargetMsSafe(
  hoursRaw: string,
  minutesRaw: string,
  secondsRaw: string,
) {
  const h = Number.parseInt(hoursRaw, 10);
  const m = Number.parseInt(minutesRaw, 10);
  const s = Number.parseInt(secondsRaw, 10);
  const hours = Number.isFinite(h) ? Math.max(0, Math.min(12, h)) : 0;
  const mins = Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0;
  const secs = Number.isFinite(s) ? Math.max(0, Math.min(59, s)) : 0;
  return hours * 3_600_000 + mins * 60_000 + secs * 1_000;
}

function computeMs(active: ActiveSnapshot | null, nowMs: number) {
  if (!active) return 0;
  let total = Math.max(0, active.accumulatedMs);
  if (active.status === FOCUS_STATUS_RUNNING && active.runningSince) {
    const since = Date.parse(active.runningSince);
    if (!Number.isNaN(since)) {
      total += Math.max(0, nowMs - since);
    }
  }
  return total;
}

function useStarField(count: number) {
  return useMemo(() => {
    const stars: {
      left: string;
      top: string;
      size: number;
      delay: string;
      dur: string;
    }[] = [];
    let seed = 97;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i += 1) {
      stars.push({
        left: `${rand() * 100}%`,
        top: `${rand() * 100}%`,
        size: 1 + rand() * 2.4,
        delay: `${rand() * 10}s`,
        dur: `${3.5 + rand() * 7}s`,
      });
    }
    return stars;
  }, [count]);
}

function ConstellationMap({
  active,
  living,
  index,
  wing,
  shifting,
}: {
  active: boolean;
  living: boolean;
  index: number;
  wing: 0 | 1 | 2 | 3;
  shifting: boolean;
}) {
  const points = useMemo(() => constellationForIndex(index), [index]);
  const bright = brightStarIndex(index, points.length);
  const poly = points.map(([x, y]) => `${x},${y}`).join(" ");
  const brightPt = points[bright] ?? points[0];

  return (
    <svg
      key={index}
      className={`focus-sky__map focus-sky__map--wing-${wing} ${active ? "is-active" : ""} ${living ? "is-living" : ""} ${shifting ? "is-shifting" : ""}`}
      viewBox="0 0 800 520"
      aria-hidden="true"
    >
      {brightPt ? (
        <circle
          className="focus-sky__aura"
          cx={brightPt[0]}
          cy={brightPt[1]}
          r="18"
          fill="none"
        />
      ) : null}
      <polyline className="focus-sky__line" points={poly} fill="none" />
      {points.map(([x, y], i) => (
        <circle
          key={`${index}-${i}`}
          className={`focus-sky__node ${i === bright ? "is-bright" : ""}`}
          cx={x}
          cy={y}
          r={i === bright ? 4.2 : 2.1}
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </svg>
  );
}

export function FocusTimer({ pageMode, active, bindOptions }: FocusTimerProps) {
  const router = useRouter();
  const chamberRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [essayOpen, setEssayOpen] = useState(false);
  const [essayTitle, setEssayTitle] = useState("");
  const [essayBody, setEssayBody] = useState("");
  const [essaySavedId, setEssaySavedId] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [doneArchiveId, setDoneArchiveId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [bindKey, setBindKey] = useState("");
  const [targetHours, setTargetHours] = useState("0");
  const [targetMinutes, setTargetMinutes] = useState("25");
  const [targetSeconds, setTargetSeconds] = useState("0");
  const [targetReached, setTargetReached] = useState(false);
  const [arrivedOpen, setArrivedOpen] = useState(false);
  const alertedRef = useRef(false);
  const titleId = useId();
  const essayTitleId = useId();
  const stars = useStarField(64);

  const sessionMode = active?.mode ?? pageMode;
  const isCountdown = sessionMode === FOCUS_MODE_COUNTDOWN;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /** 鼠标 / 触控：星野视差 + 凝视光斑 */
  useEffect(() => {
    const el = chamberRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    let live = true;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    const onDown = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty(
        "--tx",
        `${(((e.clientX - r.left) / r.width) * 100).toFixed(2)}%`,
      );
      el.style.setProperty(
        "--ty",
        `${(((e.clientY - r.top) / r.height) * 100).toFixed(2)}%`,
      );
      el.classList.remove("is-tap");
      void el.offsetWidth;
      el.classList.add("is-tap");
    };

    const onTapEnd = () => {
      window.setTimeout(() => el.classList.remove("is-tap"), 520);
    };

    const tick = () => {
      if (!live) return;
      cur.x += (target.x - cur.x) * 0.07;
      cur.y += (target.y - cur.y) * 0.07;
      el.style.setProperty("--mx", cur.x.toFixed(4));
      el.style.setProperty("--my", cur.y.toFixed(4));
      el.style.setProperty("--gx", `${((cur.x * 0.5 + 0.5) * 100).toFixed(2)}%`);
      el.style.setProperty("--gy", `${((cur.y * 0.5 + 0.5) * 100).toFixed(2)}%`);
      raf = window.requestAnimationFrame(tick);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onTapEnd);
    raf = window.requestAnimationFrame(tick);

    return () => {
      live = false;
      window.cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onTapEnd);
    };
  }, []);

  useEffect(() => {
    if (!active || active.status !== FOCUS_STATUS_RUNNING) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active?.id, active?.status, active?.runningSince]);

  useEffect(() => {
    setNowMs(Date.now());
  }, [active?.id, active?.status, active?.accumulatedMs, active?.runningSince]);

  const displayMs = computeMs(active, nowMs);
  const draftTargetMs = parseTargetMsSafe(
    targetHours,
    targetMinutes,
    targetSeconds,
  );
  const targetMs = active?.targetMs ?? null;
  const remainMs =
    isCountdown && targetMs != null
      ? Math.max(0, targetMs - displayMs)
      : null;
  /** 空闲逆漏：表盘预览自定义目标时长 */
  const clockMs =
    !active && pageMode === FOCUS_MODE_COUNTDOWN
      ? draftTargetMs
      : (remainMs ?? displayMs);
  const isRunning = active?.status === FOCUS_STATUS_RUNNING;
  const isPaused = active?.status === FOCUS_STATUS_PAUSED;
  const engaged = Boolean(active);
  const phase: "idle" | "running" | "paused" = !active
    ? "idle"
    : isRunning
      ? "running"
      : "paused";

  useEffect(() => {
    if (!active || !isCountdown || targetMs == null) {
      alertedRef.current = false;
      setTargetReached(false);
      setArrivedOpen(false);
      return;
    }
    if (displayMs < targetMs) {
      if (displayMs < targetMs - 500) {
        alertedRef.current = false;
        setTargetReached(false);
      }
      return;
    }
    setTargetReached(true);
    if (alertedRef.current) return;
    alertedRef.current = true;
    setArrivedOpen(true);
    if (active.status === FOCUS_STATUS_RUNNING) {
      startTransition(async () => {
        await pauseFocusAction(active.id);
        router.refresh();
      });
    }
  }, [active, displayMs, isCountdown, targetMs, router]);

  const secondAngle = ((Math.floor(clockMs / 1000) % 60) / 60) * 360;
  const { index: xiuIndex, xiu } = xiuAtElapsed(displayMs);

  useEffect(() => {
    if (!engaged) return;
    setShifting(true);
    const t = window.setTimeout(() => setShifting(false), 780);
    return () => window.clearTimeout(t);
  }, [engaged, xiuIndex]);

  function run(
    action: () => Promise<{
      error?: string;
      archiveId?: string;
      essayId?: string;
    }>,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.archiveId) {
        setDoneArchiveId(result.archiveId);
        setEndOpen(false);
        setReflection("");
      }
      if (result.essayId) {
        setEssaySavedId(result.essayId);
        setEssayOpen(false);
        setEssayTitle("");
        setEssayBody("");
      }
      router.refresh();
    });
  }

  function applyPreset(ms: number) {
    const totalSec = Math.floor(ms / 1_000);
    setTargetHours(String(Math.floor(totalSec / 3600)));
    setTargetMinutes(String(Math.floor((totalSec % 3600) / 60)));
    setTargetSeconds(String(totalSec % 60));
  }

  function onStart() {
    const key = bindKey || null;
    if (pageMode === FOCUS_MODE_COUNTDOWN) {
      const ms = draftTargetMs;
      if (ms < 1_000) {
        setError("请设定至少 1 秒的倒计时");
        return;
      }
      if (ms > 12 * 3_600_000) {
        setError("倒计时不能超过 12 小时");
        return;
      }
      run(() => startCountdownFocusAction(ms, key));
      return;
    }
    run(() => startForwardFocusAction(key));
  }

  return (
    <div
      ref={chamberRef}
      className={`focus-chamber focus-chamber--${phase} focus-chamber--wing-${xiu.wing} ${engaged ? "is-engaged" : "is-idle"} ${entered ? "is-entered" : ""} ${shifting ? "is-xiu-shift" : ""}`}
    >
      <div className="focus-chamber__parallax focus-chamber__parallax--far" aria-hidden="true">
        <div className="focus-chamber__nebula" />
      </div>
      <div className="focus-chamber__veil" aria-hidden="true" />
      <div className="focus-chamber__parallax focus-chamber__parallax--mid" aria-hidden="true">
        <div className="focus-chamber__stars">
          {stars.map((s, i) => (
            <span
              key={i}
              className="focus-chamber__star"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                animationDelay: s.delay,
                animationDuration: s.dur,
              }}
            />
          ))}
        </div>
      </div>
      <div className="focus-chamber__gaze" aria-hidden="true" />
      <div className="focus-chamber__tap" aria-hidden="true" />
      {shifting ? <div className="focus-chamber__flare" aria-hidden="true" /> : null}

      <header className="focus-chamber__chrome">
        <Link href="/app/focus" className="focus-chamber__nav-link">
          ← 凝时
        </Link>
        <div className="focus-chamber__brand">
          <p className="focus-chamber__eyebrow">
            星宿 · {isCountdown ? "逆漏" : "顺钟"}
          </p>
          <h1 className="focus-chamber__title">
            {isCountdown ? (
              <PoeticName
                name="逆漏"
                tip="设定时长倒数，到点提醒，适合限时任务"
              />
            ) : (
              <PoeticName
                name="顺钟"
                tip="正向累计专注时长，可暂停、继续、结束"
              />
            )}
          </h1>
        </div>
        <Link href="/app/focus/records" className="focus-chamber__nav-link">
          凝录 →
        </Link>
      </header>

      <div className="focus-sky" aria-hidden={!engaged}>
        <div className="focus-sky__parallax">
          <ConstellationMap
            active={engaged}
            living={isRunning}
            index={xiuIndex}
            wing={xiu.wing}
            shifting={shifting}
          />
        </div>
        <div
          className={`focus-sky__copy ${shifting ? "is-shifting" : ""} ${isRunning ? "is-living" : ""}`}
          key={xiuIndex}
        >
          {engaged ? (
            <>
              <p className="focus-sky__palace">{xiu.palace}</p>
              <p className="focus-sky__xiu">
                <span>{xiu.name}</span>宿
              </p>
              <p className="focus-sky__motto">{xiu.motto}</p>
              <p className="focus-sky__hint">
                {targetReached
                  ? "逆漏到点 · 可结束或继续加时"
                  : isPaused
                    ? "星轨暂驻 · 心神可再启"
                    : "每满一分钟，换宿前行"}
              </p>
              {active?.bindLabel ? (
                <p className="focus-sky__hint">绑 · {active.bindLabel}</p>
              ) : null}
            </>
          ) : (
            <p className="focus-sky__idle-hint">
              {isCountdown
                ? "设定时长后启漏 · 星轨倒数"
                : "二十八宿静候 · 启钟后星轨徐开"}
            </p>
          )}
        </div>
      </div>

      <div className="focus-dock">
        <div className="focus-dial">
          <div
            className={`focus-dial__halo ${isRunning ? "is-spin" : ""} ${!engaged ? "is-breathe" : ""}`}
          />
          <svg className="focus-dial__svg" viewBox="0 0 320 320" aria-hidden="true">
            <circle className="focus-dial__track" cx="160" cy="160" r="132" fill="none" />
            <circle
              className="focus-dial__track focus-dial__track--inner"
              cx="160"
              cy="160"
              r="108"
              fill="none"
            />
            <g
              className={isRunning ? "focus-dial__orbit-min" : undefined}
              style={
                !isRunning
                  ? {
                      transform: `rotate(${((Math.floor(clockMs / 60000) % 60) / 60) * 360}deg)`,
                      transformOrigin: "160px 160px",
                    }
                  : undefined
              }
            >
              <circle
                cx="160"
                cy="28"
                r="3.5"
                className="focus-dial__bead focus-dial__bead--amber"
              />
            </g>
            <g
              style={{
                transform: `rotate(${secondAngle}deg)`,
                transformOrigin: "160px 160px",
                transition: isRunning ? "transform 0.25s linear" : "none",
              }}
            >
              <circle
                cx="160"
                cy="52"
                r="2.2"
                className="focus-dial__bead focus-dial__bead--teal"
              />
            </g>
          </svg>
          <div className="focus-dial__core">
            <p className="focus-dial__clock" aria-live="polite">
              {formatFocusClock(clockMs)}
            </p>
            {engaged && isCountdown ? (
              <p className="focus-dial__phrase">
                已专注 {formatFocusClock(displayMs)}
              </p>
            ) : null}
            {!engaged ? (
              <p className="focus-dial__phrase">
                {pageMode === FOCUS_MODE_COUNTDOWN
                  ? "下方设定时长后启漏"
                  : "按下启钟 · 钟移星开"}
              </p>
            ) : null}
          </div>
        </div>

        {!engaged ? (
          <>
            <div className="focus-chamber__setup">
              {pageMode === FOCUS_MODE_COUNTDOWN ? (
                <div className="focus-chamber__duration">
                  <p className="focus-chamber__setup-label">倒计时长</p>
                  <div className="focus-chamber__duration-fields">
                    <label className="focus-chamber__duration-field">
                      <span>时</span>
                      <input
                        type="number"
                        min={0}
                        max={12}
                        step={1}
                        value={targetHours}
                        onChange={(e) => {
                          setTargetHours(e.target.value);
                          setError(null);
                        }}
                        className="auth-field focus-chamber__duration-input"
                      />
                    </label>
                    <span className="focus-chamber__duration-colon" aria-hidden>
                      :
                    </span>
                    <label className="focus-chamber__duration-field">
                      <span>分</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        step={1}
                        value={targetMinutes}
                        onChange={(e) => {
                          setTargetMinutes(e.target.value);
                          setError(null);
                        }}
                        className="auth-field focus-chamber__duration-input"
                      />
                    </label>
                    <span className="focus-chamber__duration-colon" aria-hidden>
                      :
                    </span>
                    <label className="focus-chamber__duration-field">
                      <span>秒</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        step={1}
                        value={targetSeconds}
                        onChange={(e) => {
                          setTargetSeconds(e.target.value);
                          setError(null);
                        }}
                        className="auth-field focus-chamber__duration-input"
                      />
                    </label>
                  </div>
                  <div className="focus-chamber__presets">
                    {COUNTDOWN_PRESETS.map((p) => (
                      <button
                        key={p.ms}
                        type="button"
                        className={`focus-chamber__preset ${
                          draftTargetMs === p.ms ? "is-active" : ""
                        }`}
                        onClick={() => {
                          applyPreset(p.ms);
                          setError(null);
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <FocusBindPicker
                value={bindKey}
                options={bindOptions}
                onChange={setBindKey}
              />
            </div>
            <button
              type="button"
              disabled={pending}
              className="focus-btn focus-btn--primary focus-dock__start"
              onClick={onStart}
            >
              {isCountdown ? "启漏" : "启钟"}
            </button>
            {error ? (
              <p className="focus-chamber__msg text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
            {doneArchiveId ? (
              <p className="focus-chamber__msg">
                星光已凝成录。{" "}
                <Link
                  href={galleryDetailHref(doneArchiveId, "focus-record")}
                  className="text-[var(--teal)] underline-offset-4 hover:underline"
                >
                  看馆藏
                </Link>
                {" · "}
                <Link
                  href="/app/focus/records"
                  className="text-[var(--amber)] underline-offset-4 hover:underline"
                >
                  凝录列表
                </Link>
              </p>
            ) : null}
            {essaySavedId ? (
              <p className="focus-chamber__msg">
                随笔已记。{" "}
                <Link
                  href={`/app/present/essays/${essaySavedId}`}
                  className="text-[var(--teal)] underline-offset-4 hover:underline"
                >
                  打开流思笺
                </Link>
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {engaged ? (
        <div className="focus-chamber__controls focus-chamber__controls--docked">
          {isRunning ? (
            <button
              type="button"
              disabled={pending}
              className="focus-btn"
              onClick={() => run(() => pauseFocusAction(active!.id))}
            >
              暂停
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              className="focus-btn focus-btn--primary"
              onClick={() => run(() => resumeFocusAction(active!.id))}
            >
              继续
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            className="focus-btn"
            onClick={() => {
              setError(null);
              setEssayOpen(true);
            }}
          >
            写随笔
          </button>
          <button
            type="button"
            disabled={pending}
            className="focus-btn focus-btn--teal"
            onClick={() => {
              setError(null);
              setEndOpen(true);
            }}
          >
            结束
          </button>
        </div>
      ) : null}

      {engaged && error ? (
        <p className="focus-chamber__msg text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <NoticeDialog
        open={arrivedOpen}
        title="逆漏到点"
        message="设定时长已到。可结束并生成凝录，或继续加时。"
        confirmLabel="知道了"
        onClose={() => setArrivedOpen(false)}
      />

      {engaged && essaySavedId ? (
        <p className="focus-chamber__msg">
          随笔已记。{" "}
          <Link
            href={`/app/present/essays/${essaySavedId}`}
            className="text-[var(--teal)] underline-offset-4 hover:underline"
          >
            打开流思笺
          </Link>
        </p>
      ) : null}

      {essayOpen && active ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "var(--overlay)" }}
          role="presentation"
          onClick={() => {
            if (!pending) setEssayOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={essayTitleId}
            className="w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--dialog-shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={essayTitleId}
              className="text-lg tracking-[0.08em] text-[var(--paper)]"
            >
              凝时随记
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--mist)]">
              写入流思笺，计时不中断。可稍后到今时际继续改。
            </p>
            <label className="mt-3 block text-sm text-[var(--mist)]">
              标题
              <input
                className="auth-field mt-1 w-full"
                value={essayTitle}
                disabled={pending}
                onChange={(e) => setEssayTitle(e.target.value)}
                placeholder="可选"
              />
            </label>
            <label className="mt-3 block text-sm text-[var(--mist)]">
              正文
              <textarea
                className="auth-field mt-1 min-h-[100px] w-full resize-y"
                value={essayBody}
                disabled={pending}
                onChange={(e) => setEssayBody(e.target.value)}
                placeholder="灵感碎片…"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                className="ui-btn-ghost ui-btn-sm"
                onClick={() => setEssayOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={pending}
                className="ui-btn-primary !w-auto px-4 py-2 text-xs"
                onClick={() =>
                  run(() =>
                    createFocusEssayAction(
                      active.id,
                      essayTitle,
                      essayBody,
                    ),
                  )
                }
              >
                {pending ? "保存中…" : "收入流思笺"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {endOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "var(--overlay)" }}
          role="presentation"
          onClick={() => {
            if (!pending) setEndOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--dialog-shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={titleId}
              className="text-lg tracking-[0.08em] text-[var(--paper)]"
            >
              结束{isCountdown ? "逆漏" : "顺钟"}？
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--mist)]">
              将按累计时长生成凝录，沉淀入昔时往拾忆馆藏。心得可选填。
            </p>
            <label className="mt-4 block text-sm text-[var(--mist)]">
              心得（可选）
              <textarea
                className="auth-field mt-1 min-h-[100px] w-full resize-y"
                value={reflection}
                disabled={pending}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="这段时间的收获或心情…"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                className="ui-btn-ghost ui-btn-sm"
                onClick={() => setEndOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={pending || !active}
                className="ui-btn-primary !w-auto px-4 py-2 text-xs"
                onClick={() => {
                  if (!active) return;
                  run(() => completeFocusAction(active.id, reflection));
                }}
              >
                {pending ? "提交中…" : "结束并生成凝录"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
