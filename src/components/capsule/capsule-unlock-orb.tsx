"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

export type CapsuleUnlockItem = {
  id: string;
  title: string;
  body: string;
  dueLabel: string;
};

type CapsuleUnlockOrbProps = {
  userId: string;
  items: CapsuleUnlockItem[];
};

const OPENED_KEY = "owncosmos-capsule-opened";
const SNOOZE_KEY = "owncosmos-capsule-snooze";

type DayStore = { day: string; ids: string[] };

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readIdList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function writeIdList(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
}

function readSnooze(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${SNOOZE_KEY}:${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DayStore;
    if (parsed.day !== todayKey()) return [];
    return Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch {
    return [];
  }
}

function writeSnooze(userId: string, ids: string[]) {
  const payload: DayStore = { day: todayKey(), ids };
  localStorage.setItem(`${SNOOZE_KEY}:${userId}`, JSON.stringify(payload));
}

type Phase = "idle" | "burst" | "reveal";

/** 到期胶囊：右下角星核浮标 → 启封动效小窗（不归档） */
export function CapsuleUnlockOrb({ userId, items }: CapsuleUnlockOrbProps) {
  const titleId = useId();
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const opened = readIdList(`${OPENED_KEY}:${userId}`);
    const snoozed = readSnooze(userId);
    setHiddenIds([...new Set([...opened, ...snoozed])]);
    setHydrated(true);
  }, [userId]);

  const active = useMemo(
    () => items.filter((item) => !hiddenIds.includes(item.id)),
    [items, hiddenIds],
  );

  useEffect(() => {
    if (!hydrated || active.length === 0) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 420);
    return () => window.clearTimeout(t);
  }, [hydrated, active.length]);

  const current = active[Math.min(index, Math.max(0, active.length - 1))];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "reveal") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, phase]);

  useEffect(() => {
    if (phase !== "burst") return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 80 : 720;
    const t = window.setTimeout(() => setPhase("reveal"), ms);
    return () => window.clearTimeout(t);
  }, [phase]);

  function markOpened(ids: string[]) {
    const key = `${OPENED_KEY}:${userId}`;
    const next = [...new Set([...readIdList(key), ...ids])];
    writeIdList(key, next);
    setHiddenIds((prev) => [...new Set([...prev, ...ids])]);
  }

  function snooze(ids: string[]) {
    const next = [...new Set([...readSnooze(userId), ...ids])];
    writeSnooze(userId, next);
    setHiddenIds((prev) => [...new Set([...prev, ...ids])]);
  }

  function startReveal() {
    if (active.length === 0) return;
    setIndex(0);
    setOpen(true);
    setPhase("burst");
  }

  function accept() {
    if (!current) return;
    markOpened([current.id]);
    const rest = active.filter((item) => item.id !== current.id);
    if (rest.length === 0) {
      setOpen(false);
      setPhase("idle");
      setVisible(false);
      return;
    }
    setIndex(0);
    setPhase("burst");
  }

  function later() {
    if (!current) return;
    snooze([current.id]);
    setOpen(false);
    setPhase("idle");
    if (active.length <= 1) setVisible(false);
  }

  function dismissFloat() {
    snooze(active.map((item) => item.id));
    setOpen(false);
    setPhase("idle");
    setVisible(false);
  }

  if (!hydrated || active.length === 0 || !visible) return null;

  return (
    <>
      <div className="capsule-orb" role="status">
        <button
          type="button"
          className="capsule-orb__btn"
          onClick={startReveal}
          aria-label={`有 ${active.length} 枚时间胶囊可启封`}
        >
          <span className="capsule-orb__ring" aria-hidden="true" />
          <span className="capsule-orb__ring capsule-orb__ring--slow" aria-hidden="true" />
          <span className="capsule-orb__core" aria-hidden="true">
            <span className="capsule-orb__spark" />
          </span>
          <span className="capsule-orb__label">
            可启封
            {active.length > 1 ? ` · ${active.length}` : ""}
          </span>
        </button>
        <button
          type="button"
          className="capsule-orb__dismiss"
          onClick={dismissFloat}
          aria-label="今日不再提醒"
          title="今日不再提醒"
        >
          ×
        </button>
      </div>

      {open && current ? (
        <div className="capsule-reveal" data-phase={phase}>
          <button
            type="button"
            aria-label="关闭"
            className="capsule-reveal__backdrop"
            onClick={() => {
              if (phase === "reveal") setOpen(false);
            }}
          />

          {phase === "burst" ? (
            <div className="capsule-reveal__burst" aria-hidden="true">
              <span className="capsule-reveal__burst-core" />
              <span className="capsule-reveal__burst-ring" />
              <span className="capsule-reveal__burst-ring capsule-reveal__burst-ring--delay" />
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className="capsule-reveal__particle"
                  style={{ "--i": String(i) } as CSSProperties}
                />
              ))}
            </div>
          ) : null}

          {phase === "reveal" ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="capsule-reveal__panel"
            >
              <p className="font-mono text-[10px] tracking-[0.22em] text-[var(--teal)]">
                TIME CAPSULE
              </p>
              <h2
                id={titleId}
                className="capsule-reveal__title mt-1 text-xl tracking-[0.14em] text-[var(--paper)]"
              >
                启封
              </h2>
              <p className="mt-1 font-mono text-[10px] tracking-wide text-[var(--mist)]">
                解锁日 {current.dueLabel}
                {active.length > 1
                  ? ` · ${Math.min(index, active.length - 1) + 1}/${active.length}`
                  : null}
              </p>

              <div className="capsule-reveal__letter mt-4">
                <h3 className="text-base tracking-[0.08em] text-[var(--paper)]">
                  {current.title}
                </h3>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--mist)]">
                  {current.body.trim() || "（无正文）"}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/app/future/capsule?open=${current.id}`}
                  className="ui-btn-ghost ui-btn-sm"
                  onClick={() => {
                    markOpened([current.id]);
                    setOpen(false);
                  }}
                >
                  进胶囊舱
                </Link>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="ui-btn-ghost" onClick={later}>
                    稍后再看
                  </button>
                  <button
                    type="button"
                    className="ui-btn-primary !w-auto"
                    onClick={accept}
                  >
                    {active.length > 1 ? "收下 · 下一封" : "收下"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
