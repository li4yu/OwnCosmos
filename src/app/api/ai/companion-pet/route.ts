import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/lib/auth";
import { normalizePetManifest, readRasterSize } from "@/lib/companion-pet";
import {
  clearCompanionCustomPet,
  setCompanionCustomPet,
} from "@/services/companion";

export const runtime = "nodejs";

const MAX_ZIP_BYTES = 8 * 1024 * 1024;
const MAX_SHEET_BYTES = 6 * 1024 * 1024;

function safeUserDir(userId: string) {
  // 仅字母数字，避免路径穿越
  const id = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!id) throw new Error("无效用户");
  return id;
}

async function findZipEntry(
  zip: JSZip,
  pred: (name: string) => boolean,
): Promise<{ name: string; file: JSZip.JSZipObject } | null> {
  const names = Object.keys(zip.files);
  for (const name of names) {
    const file = zip.files[name];
    if (!file || file.dir) continue;
    const base = name.split(/[/\\]/).pop() || name;
    if (pred(base.toLowerCase()) || pred(name.toLowerCase())) {
      return { name, file };
    }
  }
  return null;
}

/** 上传 Petdex 兼容 zip：pet.json + spritesheet.webp */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "无效表单" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "请选择 zip 文件" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_ZIP_BYTES) {
    return NextResponse.json(
      { ok: false, error: "压缩包需小于 8MB" },
      { status: 400 },
    );
  }
  const nameLower = file.name.toLowerCase();
  if (!nameLower.endsWith(".zip") && file.type !== "application/zip" && file.type !== "application/x-zip-compressed") {
    return NextResponse.json(
      { ok: false, error: "请上传 .zip 压缩包" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf, { createFolders: false });
  } catch {
    return NextResponse.json({ ok: false, error: "无法解压压缩包" }, { status: 400 });
  }

  const jsonEntry = await findZipEntry(
    zip,
    (n) => n === "pet.json" || n.endsWith("/pet.json"),
  );
  const sheetEntry = await findZipEntry(
    zip,
    (n) =>
      n === "spritesheet.webp" ||
      n.endsWith("/spritesheet.webp") ||
      n === "spritesheet.png" ||
      n.endsWith("/spritesheet.png"),
  );
  if (!jsonEntry) {
    return NextResponse.json(
      { ok: false, error: "压缩包内缺少 pet.json" },
      { status: 400 },
    );
  }
  if (!sheetEntry) {
    return NextResponse.json(
      { ok: false, error: "压缩包内缺少 spritesheet.webp（或 png）" },
      { status: 400 },
    );
  }

  let rawJson: unknown;
  try {
    const text = await jsonEntry.file.async("string");
    rawJson = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "pet.json 不是合法 JSON" }, { status: 400 });
  }

  const sheetBuf = Buffer.from(await sheetEntry.file.async("uint8array"));
  if (sheetBuf.length <= 0 || sheetBuf.length > MAX_SHEET_BYTES) {
    return NextResponse.json(
      { ok: false, error: "精灵图过大或为空" },
      { status: 400 },
    );
  }
  const sheetSize = readRasterSize(sheetBuf);
  const normalized = normalizePetManifest(rawJson, sheetSize);
  if (!normalized.ok) {
    return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });
  }

  const sheetBase = (sheetEntry.name.split(/[/\\]/).pop() || "spritesheet.webp").toLowerCase();
  const ext = sheetBase.endsWith(".png") ? "png" : "webp";

  const uid = safeUserDir(session.user.id);
  const dir = path.join(process.cwd(), "public", "uploads", "companion", uid);
  await mkdir(dir, { recursive: true });
  const filename = `spritesheet-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), sheetBuf);

  const sheetUrl = `/uploads/companion/${uid}/${filename}`;
  const pref = await setCompanionCustomPet(
    session.user.id,
    sheetUrl,
    normalized.manifest,
  );

  return NextResponse.json({
    ok: true,
    pref: {
      petSheetUrl: pref.petSheetUrl,
      petDisplayName: pref.activePetManifest.displayName,
      activePetSheetUrl: pref.activePetSheetUrl,
      activePetManifest: pref.activePetManifest,
    },
  });
}

/** 恢复内置默认桌宠 */
export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const uid = safeUserDir(session.user.id);
  const dir = path.join(process.cwd(), "public", "uploads", "companion", uid);
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  const pref = await clearCompanionCustomPet(session.user.id);
  return NextResponse.json({
    ok: true,
    pref: {
      petSheetUrl: pref.petSheetUrl,
      petDisplayName: pref.activePetManifest.displayName,
      activePetSheetUrl: pref.activePetSheetUrl,
      activePetManifest: pref.activePetManifest,
    },
  });
}
