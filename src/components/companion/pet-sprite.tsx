"use client";

import { useEffect, useRef, useState } from "react";

/** Codex pet 规格：8×9 格，每格 192×208 */
export const PET_FRAME = { width: 192, height: 208, columns: 8, rows: 9 } as const;

export type PetAnim =
  | "idle"
  | "runRight"
  | "runLeft"
  | "wave"
  | "jump"
  | "fail"
  | "wait"
  | "run"
  | "happy";

type AnimCfg = {
  row: number;
  frames: number;
  fps: number;
  /** false=播完一轮停；true=可循环有限次 */
  loop: boolean;
  /** 最多循环几轮后停住（仅 loop=true）；Infinity=一直动 */
  maxCycles: number;
  /** 停住后隔多久再动一小段（ms）；0=不再自动再动 */
  restMs: number;
};

const ANIMS: Record<PetAnim, AnimCfg> = {
  idle: { row: 0, frames: 6, fps: 7, loop: true, maxCycles: 2, restMs: 16000 },
  runRight: { row: 1, frames: 8, fps: 10, loop: true, maxCycles: 2, restMs: 0 },
  runLeft: { row: 2, frames: 8, fps: 10, loop: true, maxCycles: 2, restMs: 0 },
  wave: { row: 3, frames: 5, fps: 8, loop: false, maxCycles: 1, restMs: 0 },
  jump: { row: 4, frames: 5, fps: 9, loop: false, maxCycles: 1, restMs: 0 },
  fail: { row: 5, frames: 6, fps: 6, loop: true, maxCycles: 2, restMs: 0 },
  wait: { row: 6, frames: 6, fps: 8, loop: true, maxCycles: 2, restMs: 0 },
  /** 生成中保持运球；手动互动用 runRight 短跑 */
  run: { row: 7, frames: 6, fps: 10, loop: true, maxCycles: Infinity, restMs: 0 },
  happy: { row: 8, frames: 6, fps: 7, loop: true, maxCycles: 2, restMs: 0 },
};

type PetSpriteProps = {
  anim: PetAnim;
  /** 显示宽度；高度按帧比例 */
  size?: number;
  className?: string;
  onOneShotEnd?: () => void;
  title?: string;
};

export function PetSprite({
  anim,
  size = 96,
  className = "",
  onOneShotEnd,
  title = "Basketball Duck",
}: PetSpriteProps) {
  const cfg = ANIMS[anim] ?? ANIMS.idle;
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const scale = size / PET_FRAME.width;
  const height = PET_FRAME.height * scale;
  const endRef = useRef(onOneShotEnd);
  endRef.current = onOneShotEnd;
  const cycleRef = useRef(0);
  const endedRef = useRef(false);

  useEffect(() => {
    setFrame(0);
    setPlaying(true);
    cycleRef.current = 0;
    endedRef.current = false;
  }, [anim]);

  useEffect(() => {
    if (!playing) {
      if (!cfg.restMs) return;
      const t = window.setTimeout(() => {
        cycleRef.current = 0;
        endedRef.current = false;
        setFrame(0);
        setPlaying(true);
      }, cfg.restMs);
      return () => window.clearTimeout(t);
    }

    const ms = Math.max(40, Math.round(1000 / cfg.fps));
    const id = window.setInterval(() => {
      setFrame((prev) => {
        const next = prev + 1;
        if (next < cfg.frames) return next;

        // 一轮结束
        if (!cfg.loop) {
          if (!endedRef.current) {
            endedRef.current = true;
            queueMicrotask(() => {
              setPlaying(false);
              endRef.current?.();
            });
          }
          return cfg.frames - 1;
        }

        cycleRef.current += 1;
        if (cycleRef.current >= cfg.maxCycles) {
          queueMicrotask(() => setPlaying(false));
          return 0; // 停在静帧
        }
        return 0;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [playing, cfg.frames, cfg.fps, cfg.loop, cfg.maxCycles, cfg.restMs, anim]);

  const col = Math.min(frame, cfg.frames - 1);
  const x = -col * PET_FRAME.width * scale;
  const y = -cfg.row * PET_FRAME.height * scale;
  const sheetW = PET_FRAME.columns * PET_FRAME.width * scale;
  const sheetH = PET_FRAME.rows * PET_FRAME.height * scale;

  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={`inline-block overflow-hidden ${className}`}
      style={{
        width: size,
        height,
        backgroundImage: "url(/companion/spritesheet.webp)",
        backgroundRepeat: "no-repeat",
        backgroundSize: `${sheetW}px ${sheetH}px`,
        backgroundPosition: `${x}px ${y}px`,
        imageRendering: "auto",
      }}
    />
  );
}

/** 按伴读 UI 状态选动画；手动互动优先 */
export function resolvePetAnim(input: {
  open: boolean;
  streaming: boolean;
  error: boolean;
  justFinished: boolean;
  waveOnce: boolean;
  manual?: PetAnim | null;
}): PetAnim {
  if (input.manual) return input.manual;
  if (input.error) return "fail";
  if (input.waveOnce) return "wave";
  if (input.justFinished) return "happy";
  if (input.streaming) return "run";
  if (input.open) return "wait";
  return "idle";
}

/** 右键菜单：互动文案可与表情错位映射 */
export const PET_MENU_ACTIONS: { anim: PetAnim; label: string }[] = [
  { anim: "wave", label: "打个招呼" },
  { anim: "jump", label: "逗它一下" },
  { anim: "runRight", label: "去运球" },
  { anim: "happy", label: "夸夸它" },
  { anim: "fail", label: "打他" },
  { anim: "wait", label: "让它发呆" },
  { anim: "idle", label: "安静站好" },
];

export function petActionDurationMs(anim: PetAnim): number {
  switch (anim) {
    case "wave":
    case "jump":
      return 900;
    case "run":
    case "runRight":
    case "runLeft":
      return 2800;
    case "fail":
    case "happy":
    case "wait":
      return 2600;
    default:
      return 1200;
  }
}
