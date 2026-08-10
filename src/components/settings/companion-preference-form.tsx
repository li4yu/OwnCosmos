"use client";

import { useEffect, useRef, useState } from "react";
import { CompanionPersonaSetup } from "@/components/companion/companion-persona-setup";
import { NoticeDialog } from "@/components/ui/notice-dialog";
import { TimePickerField } from "@/components/ui/time-picker-field";
import type { CompanionTone } from "@/db/schema";
import { COMPANION_PET_CHANGED } from "@/lib/companion-client";
import { TONE_OPTIONS } from "@/lib/companion-persona";

type Pref = {
  dnd: boolean;
  dailyBubbleCap: number;
  quietStartMin: number | null;
  quietEndMin: number | null;
  companionName: string;
  tone: CompanionTone;
  userAddress: string;
  personaReady: boolean;
  petSheetUrl: string | null;
  petDisplayName?: string;
  activePetSheetUrl?: string;
};

type Notice = { title: string; message: string };

function minToInput(min: number | null): string {
  if (min == null || min < 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function inputToMin(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm) || h > 23 || mm > 59) {
    return null;
  }
  return h * 60 + mm;
}

/** 设置 · 伴读桌宠偏好（人格 / 勿扰 / 日上限 / 静默） */
export function CompanionPreferenceForm() {
  const [pref, setPref] = useState<Pref | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [tone, setTone] = useState<CompanionTone>("warm");
  const [userAddress, setUserAddress] = useState("");
  const [petBusy, setPetBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/ai/companion-pref");
        const data = (await res.json()) as {
          ok: boolean;
          pref?: Pref & {
            activePetManifest?: { displayName?: string };
          };
        };
        if (data.ok && data.pref) {
          setPref({
            ...data.pref,
            petDisplayName:
              data.pref.activePetManifest?.displayName ||
              data.pref.petDisplayName,
          });
          setQuietStart(minToInput(data.pref.quietStartMin));
          setQuietEnd(minToInput(data.pref.quietEndMin));
          setCompanionName(data.pref.companionName);
          setTone(data.pref.tone);
          setUserAddress(data.pref.userAddress);
        }
      } catch {
        setNotice({ title: "读取失败", message: "无法读取伴读偏好" });
      }
    })();
  }, []);

  function notifyPetChanged() {
    window.dispatchEvent(new Event(COMPANION_PET_CHANGED));
  }

  async function uploadPetZip(file: File) {
    setPetBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/ai/companion-pet", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        pref?: {
          petSheetUrl: string | null;
          petDisplayName: string;
          activePetSheetUrl: string;
        };
      };
      if (!res.ok || !data.ok || !data.pref) {
        setNotice({
          title: "上传失败",
          message: data.error || "上传失败，请检查压缩包后重试",
        });
        return;
      }
      setPref((p) =>
        p
          ? {
              ...p,
              petSheetUrl: data.pref!.petSheetUrl,
              petDisplayName: data.pref!.petDisplayName,
              activePetSheetUrl: data.pref!.activePetSheetUrl,
            }
          : p,
      );
      setNotice({
        title: "已更换形象",
        message: `当前形象：${data.pref.petDisplayName}`,
      });
      notifyPetChanged();
    } catch {
      setNotice({
        title: "上传失败",
        message: "上传失败，请稍后重试",
      });
    } finally {
      setPetBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function resetPet() {
    setPetBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/companion-pet", { method: "DELETE" });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        pref?: {
          petSheetUrl: string | null;
          petDisplayName: string;
          activePetSheetUrl: string;
        };
      };
      if (!res.ok || !data.ok || !data.pref) {
        setNotice({
          title: "恢复失败",
          message: data.error || "恢复默认形象失败",
        });
        return;
      }
      setPref((p) =>
        p
          ? {
              ...p,
              petSheetUrl: data.pref!.petSheetUrl,
              petDisplayName: data.pref!.petDisplayName,
              activePetSheetUrl: data.pref!.activePetSheetUrl,
            }
          : p,
      );
      setNotice({
        title: "已恢复默认",
        message: "已恢复内置默认形象",
      });
      notifyPetChanged();
    } catch {
      setNotice({
        title: "恢复失败",
        message: "恢复失败，请稍后重试",
      });
    } finally {
      setPetBusy(false);
    }
  }

  async function save(
    patch: Partial<Pref> & { quietStart?: string; quietEnd?: string },
  ) {
    if (!pref) return;
    setPending(true);
    setMessage(null);
    const body: Record<string, unknown> = {};
    if (typeof patch.dnd === "boolean") body.dnd = patch.dnd;
    if (typeof patch.dailyBubbleCap === "number") {
      body.dailyBubbleCap = patch.dailyBubbleCap;
    }
    if (patch.quietStart !== undefined || patch.quietEnd !== undefined) {
      body.quietStartMin = inputToMin(patch.quietStart ?? quietStart);
      body.quietEndMin = inputToMin(patch.quietEnd ?? quietEnd);
    }
    if (typeof patch.companionName === "string") {
      body.companionName = patch.companionName;
      body.personaReady = true;
    }
    if (typeof patch.tone === "string") {
      body.tone = patch.tone;
      body.personaReady = true;
    }
    if (typeof patch.userAddress === "string") {
      body.userAddress = patch.userAddress;
      body.personaReady = true;
    }
    try {
      const res = await fetch("/api/ai/companion-pref", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok: boolean;
        pref?: Pref & { activePetManifest?: { displayName?: string } };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.pref) {
        setNotice({
          title: "保存失败",
          message: data.error || "保存失败",
        });
        return;
      }
      setPref({
        ...data.pref,
        petDisplayName:
          data.pref.activePetManifest?.displayName || data.pref.petDisplayName,
      });
      setQuietStart(minToInput(data.pref.quietStartMin));
      setQuietEnd(minToInput(data.pref.quietEndMin));
      setCompanionName(data.pref.companionName);
      setTone(data.pref.tone);
      setUserAddress(data.pref.userAddress);
      setMessage("已保存");
    } catch {
      setNotice({
        title: "保存失败",
        message: "保存失败，请稍后重试",
      });
    } finally {
      setPending(false);
    }
  }

  if (!pref) {
    return <p className="text-xs text-[var(--mist)]">加载中…</p>;
  }

  const usingCustom = Boolean(pref.petSheetUrl);

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--paper)]">
      <div className="flex flex-col gap-2.5 border-b border-[var(--line)] pb-3">
        <p className="text-xs font-medium text-[var(--mist)]">定制形象</p>
        <p className="text-xs leading-relaxed text-[var(--mist)]">
          请前往 petdex 网站下载压缩包，选择自己喜欢的形象。上传后右下角桌宠会立即切换；伴读对话与互动菜单仍可用（动作按压缩包内动画配置）。
        </p>
        <p className="text-xs text-[var(--paper)]">
          当前形象：
          {pref.petDisplayName || (usingCustom ? "自定义" : "内置默认")}
          {usingCustom ? "（自定义）" : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            disabled={pending || petBusy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPetZip(f);
            }}
          />
          <button
            type="button"
            className="ui-btn-ghost ui-btn-sm"
            disabled={pending || petBusy}
            onClick={() => fileRef.current?.click()}
          >
            {petBusy ? "处理中…" : "上传 zip"}
          </button>
          <button
            type="button"
            className="ui-btn-ghost ui-btn-sm"
            disabled={pending || petBusy || !usingCustom}
            onClick={() => void resetPet()}
          >
            恢复默认
          </button>
        </div>
        <p className="text-[10px] text-[var(--mist)]">
          需含 pet.json 与 spritesheet.webp（或 png），体积 ≤ 8MB。标准表为
          8×9 或 8×11 格；上传后按实际像素切分。
        </p>
      </div>

      <div className="flex flex-col gap-2.5 border-b border-[var(--line)] pb-3">
        <p className="text-xs font-medium text-[var(--mist)]">人格与称呼</p>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--mist)]">伴读称呼</span>
          <input
            className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1"
            maxLength={16}
            value={companionName}
            disabled={pending}
            onChange={(e) => setCompanionName(e.target.value)}
            onBlur={() => {
              if (companionName.trim() !== pref.companionName) {
                void save({ companionName });
              }
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--mist)]">语气</span>
          <select
            className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1"
            value={tone}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as CompanionTone;
              setTone(next);
              void save({ tone: next });
            }}
          >
            {TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--mist)]">它对你的称呼</span>
          <input
            className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1"
            maxLength={16}
            value={userAddress}
            disabled={pending}
            onChange={(e) => setUserAddress(e.target.value)}
            onBlur={() => {
              if (userAddress.trim() !== pref.userAddress) {
                void save({ userAddress });
              }
            }}
          />
        </label>
        {!pref.personaReady ? (
          <CompanionPersonaSetup
            userName={pref.userAddress}
            initial={pref}
            compact
            onSaved={(p) =>
              setPref({
                ...pref,
                ...p,
              })
            }
          />
        ) : null}
      </div>

      <label className="flex items-center justify-between gap-3">
        <span>
          主动气泡勿扰
          <span className="mt-0.5 block text-xs text-[var(--mist)]">
            开启后不弹欢迎/贴士/临期轻语
          </span>
        </span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--teal)]"
          checked={pref.dnd}
          disabled={pending}
          onChange={(e) => void save({ dnd: e.target.checked })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--mist)]">每日主动气泡上限</span>
        <input
          type="number"
          min={0}
          max={20}
          className="w-24 rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1"
          value={pref.dailyBubbleCap}
          disabled={pending}
          onChange={(e) =>
            setPref({
              ...pref,
              dailyBubbleCap: Number(e.target.value) || 0,
            })
          }
          onBlur={() => void save({ dailyBubbleCap: pref.dailyBubbleCap })}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <TimePickerField
          label="静默开始"
          value={quietStart}
          disabled={pending}
          clearable
          onChange={setQuietStart}
          onCommit={(next) => void save({ quietStart: next, quietEnd })}
        />
        <TimePickerField
          label="静默结束"
          value={quietEnd}
          disabled={pending}
          clearable
          onChange={setQuietEnd}
          onCommit={(next) => void save({ quietStart, quietEnd: next })}
        />
      </div>
      <p className="text-[10px] text-[var(--mist)]">
        静默时段内不弹主动气泡；两端都空表示不限。跨午夜可用如 23:00–07:00。
      </p>

      {message ? <p className="text-xs text-[var(--teal)]">{message}</p> : null}

      <NoticeDialog
        open={Boolean(notice)}
        title={notice?.title ?? "提示"}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />
    </div>
  );
}
