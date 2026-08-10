"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PET_MANIFEST,
  DEFAULT_PET_SHEET_URL,
  inferPetFrame,
  menuActionsForManifest,
  petActionDurationMs as durationFromManifest,
  resolveAnimOrIdle,
  type PetAnimKey,
  type PetFrame,
  type PetManifest,
} from "@/lib/companion-pet";

export type PetAnim = PetAnimKey;

type RuntimeAnim = {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
  maxCycles: number;
  restMs: number;
};

function runtimeCfg(
  manifest: PetManifest,
  anim: PetAnimKey,
  frame: PetFrame,
): RuntimeAnim {
  const key = resolveAnimOrIdle(manifest, anim);
  const def = manifest.animations[key] ?? DEFAULT_PET_MANIFEST.animations.idle!;
  const isIdle = key === "idle";
  const oneShot = !def.loop;
  const row = Math.min(def.row, Math.max(0, frame.rows - 1));
  return {
    row,
    frames: Math.min(def.frames, frame.columns),
    fps: def.fps,
    loop: def.loop,
    maxCycles: oneShot ? 1 : isIdle ? 2 : key === "run" ? Infinity : 2,
    restMs: isIdle ? 16000 : 0,
  };
}

type PetSpriteProps = {
  anim: PetAnim;
  manifest?: PetManifest;
  sheetUrl?: string;
  size?: number;
  className?: string;
  onOneShotEnd?: () => void;
};

export function PetSprite({
  anim,
  manifest = DEFAULT_PET_MANIFEST,
  sheetUrl = DEFAULT_PET_SHEET_URL,
  size = 96,
  className = "",
  onOneShotEnd,
}: PetSpriteProps) {
  const [frameSpec, setFrameSpec] = useState<PetFrame>(manifest.frame);
  const cfg = runtimeCfg(manifest, anim, frameSpec);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  // 用整数像素格子，避免亚像素把下一行「头顶」露出来
  const cellW = size;
  const cellH = Math.max(
    1,
    Math.round((size * frameSpec.height) / frameSpec.width),
  );
  const endRef = useRef(onOneShotEnd);
  endRef.current = onOneShotEnd;
  const cycleRef = useRef(0);
  const endedRef = useRef(false);
  const label = manifest.displayName;

  useEffect(() => {
    setFrameSpec(manifest.frame);
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      if (!img.naturalWidth || !img.naturalHeight) return;
      const inferred = inferPetFrame(img.naturalWidth, img.naturalHeight, {
        columns:
          img.naturalWidth % manifest.frame.columns === 0
            ? manifest.frame.columns
            : undefined,
        rows:
          img.naturalHeight % manifest.frame.rows === 0
            ? manifest.frame.rows
            : undefined,
      });
      setFrameSpec((prev) =>
        prev.width === inferred.width &&
        prev.height === inferred.height &&
        prev.columns === inferred.columns &&
        prev.rows === inferred.rows
          ? prev
          : inferred,
      );
    };
    img.src = sheetUrl;
    return () => {
      cancelled = true;
    };
  }, [sheetUrl, manifest.frame, manifest.id]);

  useEffect(() => {
    setFrame(0);
    setPlaying(true);
    cycleRef.current = 0;
    endedRef.current = false;
  }, [anim, sheetUrl, manifest.id, frameSpec.width, frameSpec.height]);

  useEffect(() => {
    if (!playing) {
      if (!cfg.restMs) return;
      const t = window.setTimeout(() => {
        cycleRef.current = 0;
        setFrame(0);
        setPlaying(true);
      }, cfg.restMs);
      return () => window.clearTimeout(t);
    }

    const interval = Math.max(40, Math.round(1000 / cfg.fps));
    const id = window.setInterval(() => {
      setFrame((f) => {
        const next = f + 1;
        if (next < cfg.frames) return next;
        cycleRef.current += 1;
        if (!cfg.loop || cycleRef.current >= cfg.maxCycles) {
          // 勿在 setState updater 内同步改父组件 / 其它 state
          queueMicrotask(() => {
            setPlaying(false);
            if (!endedRef.current) {
              endedRef.current = true;
              endRef.current?.();
            }
          });
          return cfg.frames - 1;
        }
        return 0;
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [playing, cfg.frames, cfg.fps, cfg.loop, cfg.maxCycles, cfg.restMs, anim]);

  const col = Math.min(frame, cfg.frames - 1);
  const x = -col * cellW;
  const y = -cfg.row * cellH;
  const sheetW = frameSpec.columns * cellW;
  const sheetH = frameSpec.rows * cellH;

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-block overflow-hidden ${className}`}
      style={{
        width: cellW,
        height: cellH,
        backgroundImage: `url(${sheetUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${sheetW}px ${sheetH}px`,
        backgroundPosition: `${x}px ${y}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

export function resolvePetAnim(input: {
  open: boolean;
  streaming: boolean;
  error: boolean;
  justFinished: boolean;
  waveOnce: boolean;
  manual?: PetAnim | null;
  manifest?: PetManifest;
}): PetAnim {
  const m = input.manifest ?? DEFAULT_PET_MANIFEST;
  const pick = (a: PetAnimKey) => resolveAnimOrIdle(m, a);
  if (input.manual) return pick(input.manual);
  if (input.error) return pick("fail");
  if (input.waveOnce) return pick("wave");
  if (input.justFinished) return pick("happy");
  if (input.streaming) return pick("run");
  if (input.open) return pick("wait");
  return pick("idle");
}

export function petMenuActions(manifest: PetManifest = DEFAULT_PET_MANIFEST) {
  return menuActionsForManifest(manifest);
}

/** @deprecated 用 petMenuActions(manifest) */
export const PET_MENU_ACTIONS = menuActionsForManifest(DEFAULT_PET_MANIFEST);

export function petActionDurationMs(
  anim: PetAnim,
  manifest: PetManifest = DEFAULT_PET_MANIFEST,
): number {
  return durationFromManifest(manifest, resolveAnimOrIdle(manifest, anim));
}

export { DEFAULT_PET_MANIFEST, DEFAULT_PET_SHEET_URL };
