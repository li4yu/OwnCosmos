/** 桌宠包（Petdex / Codex 兼容）：pet.json + spritesheet */

export const DEFAULT_PET_SHEET_URL = "/companion/spritesheet.webp";

export type PetAnimKey =
  | "idle"
  | "runRight"
  | "runLeft"
  | "wave"
  | "jump"
  | "fail"
  | "wait"
  | "run"
  | "happy";

export const PET_ANIM_KEYS: PetAnimKey[] = [
  "idle",
  "runRight",
  "runLeft",
  "wave",
  "jump",
  "fail",
  "wait",
  "run",
  "happy",
];

export type PetAnimDef = {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
};

export type PetFrame = {
  width: number;
  height: number;
  columns: number;
  rows: number;
};

/** 从 PNG / WebP 缓冲读取宽高（不依赖 sharp） */
export function readRasterSize(
  buf: Buffer,
): { width: number; height: number } | null {
  if (buf.length >= 24 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") {
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  }
  if (
    buf.length < 16 ||
    buf.toString("ascii", 0, 4) !== "RIFF" ||
    buf.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const fourcc = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (fourcc === "VP8X" && data + 10 <= buf.length) {
      const width =
        1 + buf[data + 4]! + (buf[data + 5]! << 8) + (buf[data + 6]! << 16);
      const height =
        1 + buf[data + 7]! + (buf[data + 8]! << 8) + (buf[data + 9]! << 16);
      return { width, height };
    }
    if (
      fourcc === "VP8L" &&
      data + 5 <= buf.length &&
      buf[data] === 0x2f
    ) {
      const bits = buf.readUInt32LE(data + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    if (
      fourcc === "VP8 " &&
      data + 10 <= buf.length &&
      buf[data + 3] === 0x9d &&
      buf[data + 4] === 0x01 &&
      buf[data + 5] === 0x2a
    ) {
      return {
        width: buf.readUInt16LE(data + 6) & 0x3fff,
        height: buf.readUInt16LE(data + 8) & 0x3fff,
      };
    }
    offset = data + size + (size & 1);
  }
  return null;
}

/**
 * 按精灵图表实际像素推断格子。
 * Codex/Petdex：V1=8×9（1536×1872），V2=8×11（1536×2288），单格多为 192×208。
 * 若仍按 9 行切 V2 表，视口会裁进下一行，底部出现「半截头」。
 */
export function inferPetFrame(
  sheetW: number,
  sheetH: number,
  hinted?: Partial<PetFrame> | null,
  spriteVersionNumber?: number,
): PetFrame {
  const columns =
    hinted?.columns && hinted.columns > 0
      ? Math.min(32, Math.floor(hinted.columns))
      : 8;

  let rows =
    hinted?.rows && hinted.rows > 0
      ? Math.min(32, Math.floor(hinted.rows))
      : 0;
  if (!rows) {
    if (spriteVersionNumber === 2) rows = 11;
    else if (sheetW > 0 && sheetH > 0) {
      const cellW = sheetW / columns;
      const err = (r: number) => Math.abs(sheetH / r - cellW * (208 / 192));
      const candidates = [9, 11, 10].filter((r) => sheetH % r === 0);
      if (candidates.length) {
        rows = candidates.sort((a, b) => err(a) - err(b))[0]!;
      } else {
        rows = err(11) < err(9) ? 11 : 9;
      }
    } else {
      rows = 9;
    }
  }

  const width = Math.max(1, Math.round(sheetW / columns));
  const height = Math.max(1, Math.round(sheetH / rows));
  return { width, height, columns, rows };
}

export type PetManifest = {
  id: string;
  displayName: string;
  description?: string;
  spritesheetPath?: string;
  frame: PetFrame;
  animations: Partial<Record<PetAnimKey, PetAnimDef>>;
};

/** 内置默认（与 public/companion/pet.json 对齐） */
export const DEFAULT_PET_MANIFEST: PetManifest = {
  id: "basketball-duck",
  displayName: "Basketball Duck",
  description:
    "A cute white-haired duck pet who dribbles a basketball while running.",
  spritesheetPath: DEFAULT_PET_SHEET_URL,
  frame: { width: 192, height: 208, columns: 8, rows: 9 },
  animations: {
    idle: { row: 0, frames: 6, fps: 7, loop: true },
    runRight: { row: 1, frames: 8, fps: 10, loop: true },
    runLeft: { row: 2, frames: 8, fps: 10, loop: true },
    wave: { row: 3, frames: 5, fps: 8, loop: false },
    jump: { row: 4, frames: 5, fps: 9, loop: false },
    fail: { row: 5, frames: 6, fps: 6, loop: true },
    wait: { row: 6, frames: 6, fps: 8, loop: true },
    run: { row: 7, frames: 6, fps: 10, loop: true },
    happy: { row: 8, frames: 6, fps: 7, loop: true },
  },
};

const ANIM_ALIASES: Record<string, PetAnimKey> = {
  idle: "idle",
  Idle: "idle",
  runright: "runRight",
  runRight: "runRight",
  run_right: "runRight",
  runleft: "runLeft",
  runLeft: "runLeft",
  run_left: "runLeft",
  wave: "wave",
  Wave: "wave",
  jump: "jump",
  Jump: "jump",
  fail: "fail",
  Fail: "fail",
  cry: "fail",
  wait: "wait",
  Wait: "wait",
  run: "run",
  Run: "run",
  happy: "happy",
  Happy: "happy",
  smile: "happy",
};

export const PET_MENU_LABELS: { anim: PetAnimKey; label: string }[] = [
  { anim: "wave", label: "打个招呼" },
  { anim: "jump", label: "逗它一下" },
  { anim: "runRight", label: "跑两步" },
  { anim: "happy", label: "夸夸它" },
  { anim: "fail", label: "逗哭它" },
  { anim: "wait", label: "让它发呆" },
  { anim: "idle", label: "安静站好" },
  { anim: "run", label: "奔跑" },
  { anim: "runLeft", label: "往左跑" },
];

function asPositiveInt(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function parseAnimDef(raw: unknown): PetAnimDef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const row = Number(o.row);
  const frames = Number(o.frames);
  if (!Number.isFinite(row) || row < 0 || !Number.isFinite(frames) || frames < 1) {
    return null;
  }
  return {
    row: Math.floor(row),
    frames: Math.floor(frames),
    fps: Math.min(30, Math.max(1, asPositiveInt(o.fps, 8))),
    loop: o.loop !== false,
  };
}

/** 规范化 pet.json；可传入精灵图实测宽高以校正格子 */
export function normalizePetManifest(
  raw: unknown,
  sheetSize?: { width: number; height: number } | null,
): { ok: true; manifest: PetManifest } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "pet.json 无效" };
  }
  const o = raw as Record<string, unknown>;
  const frameRaw = o.frame;
  const fr = (frameRaw && typeof frameRaw === "object"
    ? (frameRaw as Record<string, unknown>)
    : null);
  const spriteVersionNumber = Number(o.spriteVersionNumber);
  const hinted: Partial<PetFrame> = {
    width: fr ? asPositiveInt(fr.width, 0) || undefined : undefined,
    height: fr ? asPositiveInt(fr.height, 0) || undefined : undefined,
    columns: fr ? asPositiveInt(fr.columns, 0) || undefined : undefined,
    rows: fr ? asPositiveInt(fr.rows, 0) || undefined : undefined,
  };

  let frame: PetFrame;
  if (sheetSize && sheetSize.width > 0 && sheetSize.height > 0) {
    // 以像素为准；声明的行列仅在能整除时采纳，避免 V2 高表被写成 9 行
    const colsOk =
      hinted.columns &&
      sheetSize.width % hinted.columns === 0
        ? hinted.columns
        : undefined;
    const rowsOk =
      hinted.rows && sheetSize.height % hinted.rows === 0
        ? hinted.rows
        : undefined;
    frame = inferPetFrame(
      sheetSize.width,
      sheetSize.height,
      { columns: colsOk, rows: rowsOk },
      Number.isFinite(spriteVersionNumber) ? spriteVersionNumber : undefined,
    );
  } else if (fr) {
    frame = {
      width: asPositiveInt(fr.width, DEFAULT_PET_MANIFEST.frame.width),
      height: asPositiveInt(fr.height, DEFAULT_PET_MANIFEST.frame.height),
      columns: asPositiveInt(fr.columns, DEFAULT_PET_MANIFEST.frame.columns),
      rows: asPositiveInt(fr.rows, DEFAULT_PET_MANIFEST.frame.rows),
    };
  } else if (spriteVersionNumber === 2) {
    frame = { width: 192, height: 208, columns: 8, rows: 11 };
  } else {
    frame = { ...DEFAULT_PET_MANIFEST.frame };
  }
  if (!frame.width || !frame.height || !frame.columns || !frame.rows) {
    return { ok: false, error: "frame 宽高或行列无效" };
  }
  if (frame.width > 512 || frame.height > 512 || frame.columns > 32 || frame.rows > 32) {
    return { ok: false, error: "frame 尺寸超出限制" };
  }

  const animations: Partial<Record<PetAnimKey, PetAnimDef>> = {};
  const animsRaw = o.animations;
  if (animsRaw && typeof animsRaw === "object") {
    for (const [k, v] of Object.entries(animsRaw as Record<string, unknown>)) {
      const key = ANIM_ALIASES[k] ?? ANIM_ALIASES[k.toLowerCase()];
      if (!key) continue;
      const def = parseAnimDef(v);
      if (!def) continue;
      if (def.row >= frame.rows) continue;
      if (def.frames > frame.columns) {
        def.frames = frame.columns;
      }
      animations[key] = def;
    }
  }

  // 兼容仅含元数据的包：套用默认动作表（同规格精灵图）
  if (!animations.idle) {
    Object.assign(animations, DEFAULT_PET_MANIFEST.animations);
  }

  const id =
    typeof o.id === "string" && o.id.trim()
      ? o.id.trim().slice(0, 64)
      : "custom-pet";
  const displayName =
    typeof o.displayName === "string" && o.displayName.trim()
      ? o.displayName.trim().slice(0, 48)
      : "自定义桌宠";

  return {
    ok: true,
    manifest: {
      id,
      displayName,
      description:
        typeof o.description === "string"
          ? o.description.trim().slice(0, 240)
          : undefined,
      frame,
      animations,
    },
  };
}

export function resolveAnimOrIdle(
  manifest: PetManifest,
  anim: PetAnimKey,
): PetAnimKey {
  if (manifest.animations[anim]) return anim;
  if (anim === "runRight" && manifest.animations.run) return "run";
  if (anim === "run" && manifest.animations.runRight) return "runRight";
  if (anim === "fail" && manifest.animations.wait) return "wait";
  return "idle";
}

export function menuActionsForManifest(manifest: PetManifest) {
  return PET_MENU_LABELS.filter((a) => Boolean(manifest.animations[a.anim]));
}

export function petActionDurationMs(
  manifest: PetManifest,
  anim: PetAnimKey,
): number {
  const def = manifest.animations[anim];
  if (!def) return 1200;
  const one = (def.frames / Math.max(1, def.fps)) * 1000;
  if (!def.loop) return Math.max(600, Math.round(one + 80));
  return Math.max(1200, Math.round(one * 2 + 100));
}
