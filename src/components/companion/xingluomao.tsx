"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname } from "next/navigation";
import {
  XingluomaoArt,
  preloadLuluClips,
  LULU_FRAME,
} from "@/components/companion/xingluomao-art";
import {
  lineForPathname,
  loginWelcomeLine,
  type CompanionLine,
} from "@/lib/companion-lines";

const POS_KEY = "owncosmos-xingluomao-pos";
const WELCOME_KEY = "owncosmos-xingluomao-welcomed";
const SIZE = { w: LULU_FRAME.w, h: LULU_FRAME.h };

type PetState =
  | "idle"
  | "blink"
  | "look"
  | "sleeping"
  | "waking"
  | "poke"
  | "happy"
  | "drag";

type Pos = { left: number; top: number };

type XingluomaoCompanionProps = {
  userName?: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function defaultPos(): Pos {
  if (typeof window === "undefined") return { left: 16, top: 0 };
  return {
    left: 16,
    top: Math.max(72, window.innerHeight - SIZE.h - 28),
  };
}

const SLEEP_IDLE_MS = 90_000;

export function XingluomaoCompanion({ userName }: XingluomaoCompanionProps) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [ready, setReady] = useState(false);
  const [bubble, setBubble] = useState<CompanionLine | null>(null);
  const [state, setState] = useState<PetState>("idle");

  const busyRef = useRef(false);
  const stateRef = useRef<PetState>("idle");
  const lastInteract = useRef(Date.now());
  const timers = useRef<number[]>([]);
  const bubbleTimer = useRef(0);
  const wakeUpRef = useRef<() => void>(() => {});
  const prevPathRef = useRef<string | null>(null);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    ox: number;
    oy: number;
    startX: number;
    startY: number;
  } | null>(null);

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function later(ms: number, fn: () => void) {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }

  function setPetState(next: PetState) {
    stateRef.current = next;
    setState(next);
  }

  function touch() {
    lastInteract.current = Date.now();
  }

  function returnIdle() {
    busyRef.current = false;
    setPetState("idle");
  }

  function speak(line: CompanionLine | null, opts?: { cheer?: boolean }) {
    if (!line) return;
    window.clearTimeout(bubbleTimer.current);
    setBubble(line);
    if (opts?.cheer && !busyRef.current) {
      busyRef.current = true;
      clearTimers();
      setPetState("poke");
      later(700, () => {
        setPetState("happy");
        later(500, returnIdle);
      });
    }
    bubbleTimer.current = window.setTimeout(() => {
      setBubble(null);
    }, line.durationMs ?? 5600);
  }

  useEffect(() => {
    preloadLuluClips();
    let next = defaultPos();
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Pos;
        if (typeof parsed.left === "number" && typeof parsed.top === "number") {
          next = {
            left: clamp(parsed.left, 4, window.innerWidth - SIZE.w - 4),
            top: clamp(parsed.top, 56, window.innerHeight - SIZE.h - 4),
          };
        }
      }
    } catch {
      // ignore
    }
    setPos(next);
    setReady(true);

    let showLogin = true;
    try {
      if (sessionStorage.getItem(WELCOME_KEY)) showLogin = false;
      else sessionStorage.setItem(WELCOME_KEY, "1");
    } catch {
      showLogin = true;
    }
    if (showLogin) {
      speak(loginWelcomeLine(userName), { cheer: true });
    }
    prevPathRef.current = pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  // 切换模块 / 子功能 → 特定台词
  useEffect(() => {
    if (!ready) return;
    const prev = prevPathRef.current;
    if (prev === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prev === pathname) return;
    prevPathRef.current = pathname;
    const line = lineForPathname(pathname);
    speak(line, { cheer: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, ready]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const root = rootRef.current;
      if (!root || stateRef.current !== "sleeping") return;
      const rect = root.getBoundingClientRect();
      const near =
        e.clientX > rect.left - 40 &&
        e.clientX < rect.right + 40 &&
        e.clientY > rect.top - 40 &&
        e.clientY < rect.bottom + 40;
      if (near) wakeUpRef.current();
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    let live = true;
    let microTimer = 0;
    let sleepCheck = 0;

    function scheduleMicro() {
      microTimer = window.setTimeout(() => {
        if (!live) return;
        if (!busyRef.current && stateRef.current === "idle") {
          busyRef.current = true;
          setPetState("look");
          later(2200, returnIdle);
        }
        scheduleMicro();
      }, 10_000 + Math.random() * 14_000);
    }

    sleepCheck = window.setInterval(() => {
      if (!live || busyRef.current) return;
      if (stateRef.current !== "idle") return;
      if (Date.now() - lastInteract.current < SLEEP_IDLE_MS) return;
      setPetState("sleeping");
    }, 4000);

    scheduleMicro();
    return () => {
      live = false;
      window.clearTimeout(microTimer);
      window.clearInterval(sleepCheck);
      window.clearTimeout(bubbleTimer.current);
      clearTimers();
    };
  }, []);

  function wakeUp() {
    if (stateRef.current !== "sleeping") return;
    touch();
    busyRef.current = true;
    clearTimers();
    setPetState("waking");
    later(800, () => {
      setPetState("happy");
      later(900, returnIdle);
    });
  }
  wakeUpRef.current = wakeUp;

  function persist(next: Pos) {
    setPos(next);
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const el = rootRef.current;
    if (!el || !pos) return;
    touch();
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      ox: e.clientX - pos.left,
      oy: e.clientY - pos.top,
      startX: e.clientX,
      startY: e.clientY,
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag?.active || !pos) return;
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5) {
      if (!drag.moved) {
        drag.moved = true;
        busyRef.current = true;
        clearTimers();
        setPetState("drag");
      }
    }
    if (!drag.moved) return;
    setPos({
      left: clamp(e.clientX - drag.ox, 4, window.innerWidth - SIZE.w - 4),
      top: clamp(e.clientY - drag.oy, 56, window.innerHeight - SIZE.h - 4),
    });
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = rootRef.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (!drag) return;
    if (drag.moved && pos) {
      persist(pos);
      setPetState("happy");
      later(800, returnIdle);
    } else if (!drag.moved) {
      if (stateRef.current === "sleeping") {
        wakeUp();
      } else if (!busyRef.current || stateRef.current === "idle") {
        busyRef.current = true;
        clearTimers();
        setPetState("poke");
        later(900, () => {
          setPetState("happy");
          later(700, returnIdle);
        });
      }
    }
    dragRef.current = null;
  }

  if (!ready || !pos) return null;

  return (
    <div
      ref={rootRef}
      className={`xingluomao is-${state}${bubble ? " has-bubble" : ""}`}
      style={{ left: pos.left, top: pos.top }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label="噜噜 · 伴读小宠（可拖动，点击互动）"
    >
      {bubble ? (
        <div className="xingluomao__bubble" role="status">
          {bubble.text}
        </div>
      ) : null}
      <div className="xingluomao__stage">
        <XingluomaoArt state={state} />
      </div>
    </div>
  );
}
