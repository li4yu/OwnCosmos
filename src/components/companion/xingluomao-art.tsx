"use client";

/** Codex Pet 标准行：idle / wave / jump / run / waiting / review / failed */
const CLIPS = {
  idle: "/companion/lulu-idle.webp",
  sleep: "/companion/lulu-sleep.webp",
  wave: "/companion/lulu-wave.webp",
  jump: "/companion/lulu-jump.webp",
  waiting: "/companion/lulu-waiting.webp",
  review: "/companion/lulu-review.webp",
  "run-right": "/companion/lulu-run-right.webp",
  running: "/companion/lulu-running.webp",
  failed: "/companion/lulu-failed.webp",
} as const;

export type LuluClip = keyof typeof CLIPS;

const STATE_CLIP: Record<string, LuluClip> = {
  idle: "idle",
  blink: "idle",
  look: "review",
  sleeping: "sleep",
  waking: "wave",
  poke: "wave",
  happy: "jump",
  drag: "run-right",
};

type XingluomaoArtProps = {
  state: string;
};

const FRAME = { w: 96, h: 104 };

/** 噜噜：Codex Pet atlas 8×9 / 192×208 */
export function XingluomaoArt({ state }: XingluomaoArtProps) {
  const clip = STATE_CLIP[state] ?? "idle";
  const src = CLIPS[clip];

  return (
    <div className="xingluomao__sprite" data-state={state} data-clip={clip}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        className="xingluomao__photo"
        src={src}
        alt=""
        draggable={false}
        width={FRAME.w}
        height={FRAME.h}
      />
    </div>
  );
}

export function preloadLuluClips() {
  Object.values(CLIPS).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

export const LULU_FRAME = FRAME;
