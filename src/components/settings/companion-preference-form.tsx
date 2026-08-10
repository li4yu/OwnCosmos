"use client";

import { useEffect, useState } from "react";
import { CompanionPersonaSetup } from "@/components/companion/companion-persona-setup";
import type { CompanionTone } from "@/db/schema";
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
};

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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [tone, setTone] = useState<CompanionTone>("warm");
  const [userAddress, setUserAddress] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/ai/companion-pref");
        const data = (await res.json()) as { ok: boolean; pref?: Pref };
        if (data.ok && data.pref) {
          setPref(data.pref);
          setQuietStart(minToInput(data.pref.quietStartMin));
          setQuietEnd(minToInput(data.pref.quietEndMin));
          setCompanionName(data.pref.companionName);
          setTone(data.pref.tone);
          setUserAddress(data.pref.userAddress);
        }
      } catch {
        setError("无法读取伴读偏好");
      }
    })();
  }, []);

  async function save(
    patch: Partial<Pref> & { quietStart?: string; quietEnd?: string },
  ) {
    if (!pref) return;
    setPending(true);
    setError(null);
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
        pref?: Pref;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.pref) {
        setError(data.error || "保存失败");
        return;
      }
      setPref(data.pref);
      setQuietStart(minToInput(data.pref.quietStartMin));
      setQuietEnd(minToInput(data.pref.quietEndMin));
      setCompanionName(data.pref.companionName);
      setTone(data.pref.tone);
      setUserAddress(data.pref.userAddress);
      setMessage("已保存");
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  if (!pref) {
    return <p className="text-xs text-[var(--mist)]">加载中…</p>;
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--paper)]">
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
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--mist)]">静默开始</span>
          <input
            type="time"
            className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1"
            value={quietStart}
            disabled={pending}
            onChange={(e) => setQuietStart(e.target.value)}
            onBlur={() => void save({ quietStart, quietEnd })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--mist)]">静默结束</span>
          <input
            type="time"
            className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1"
            value={quietEnd}
            disabled={pending}
            onChange={(e) => setQuietEnd(e.target.value)}
            onBlur={() => void save({ quietStart, quietEnd })}
          />
        </label>
      </div>
      <p className="text-[10px] text-[var(--mist)]">
        静默时段内不弹主动气泡；两端都空表示不限。跨午夜可用如 23:00–07:00。
      </p>

      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-xs text-[var(--teal)]">{message}</p> : null}
    </div>
  );
}
