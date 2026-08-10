"use client";

import { useState } from "react";
import {
  DEFAULT_COMPANION_NAME,
  DEFAULT_COMPANION_TONE,
  DEFAULT_USER_ADDRESS,
  type CompanionTone,
} from "@/db/schema";
import { TONE_OPTIONS } from "@/lib/companion-persona";
import { notifyCompanionPrefChanged } from "@/lib/companion-client";

export type CompanionPersonaFields = {
  companionName: string;
  tone: CompanionTone;
  userAddress: string;
  personaReady: boolean;
};

type Props = {
  userName: string;
  initial?: Partial<CompanionPersonaFields>;
  onSaved: (persona: CompanionPersonaFields) => void;
  compact?: boolean;
};

/** 首次伴读人格引导 / 可复用的精简表单块 */
export function CompanionPersonaSetup({
  userName,
  initial,
  onSaved,
  compact = false,
}: Props) {
  const [companionName, setCompanionName] = useState(
    initial?.companionName?.trim() || DEFAULT_COMPANION_NAME,
  );
  const [tone, setTone] = useState<CompanionTone>(
    initial?.tone || DEFAULT_COMPANION_TONE,
  );
  const [userAddress, setUserAddress] = useState(
    initial?.userAddress?.trim() || userName?.trim() || DEFAULT_USER_ADDRESS,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(skip: boolean) {
    setPending(true);
    setError(null);
    try {
      const body = skip
        ? { skipPersonaSetup: true }
        : {
            companionName,
            tone,
            userAddress,
            personaReady: true,
          };
      const res = await fetch("/api/ai/companion-pref", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok: boolean;
        pref?: CompanionPersonaFields;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.pref) {
        setError(data.error || "保存失败");
        return;
      }
      onSaved({
        companionName: data.pref.companionName,
        tone: data.pref.tone,
        userAddress: data.pref.userAddress,
        personaReady: data.pref.personaReady,
      });
      notifyCompanionPrefChanged();
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-3"
          : "companion-persona flex flex-col gap-3 p-1"
      }
    >
      {!compact ? (
        <div>
          <p className="text-sm font-medium text-[var(--paper)]">
            先认识一下伴读
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--mist)]">
            给它起个称呼、选个语气，并告诉它怎么叫你。之后可在设置里改。
          </p>
        </div>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--mist)]">伴读叫什么</span>
        <input
          className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--paper)]"
          maxLength={16}
          value={companionName}
          disabled={pending}
          onChange={(e) => setCompanionName(e.target.value)}
          placeholder={DEFAULT_COMPANION_NAME}
        />
      </label>

      <fieldset className="flex flex-col gap-1.5" disabled={pending}>
        <legend className="text-xs text-[var(--mist)]">语气</legend>
        <div className="grid grid-cols-1 gap-1.5">
          {TONE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-2 rounded border px-2 py-1.5 text-sm ${
                tone === opt.value
                  ? "border-[var(--teal)] bg-[var(--teal)]/10"
                  : "border-[var(--line)]"
              }`}
            >
              <input
                type="radio"
                name="companion-tone"
                className="mt-1 accent-[var(--teal)]"
                checked={tone === opt.value}
                onChange={() => setTone(opt.value)}
              />
              <span>
                <span className="text-[var(--paper)]">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--mist)]">
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--mist)]">它怎么称呼你</span>
        <input
          className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--paper)]"
          maxLength={16}
          value={userAddress}
          disabled={pending}
          onChange={(e) => setUserAddress(e.target.value)}
          placeholder={userName || DEFAULT_USER_ADDRESS}
        />
      </label>

      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          className="companion-chat__send"
          onClick={() => void submit(false)}
        >
          {pending ? "保存中…" : "就这样"}
        </button>
        {!compact ? (
          <button
            type="button"
            disabled={pending}
            className="companion-chat__tool"
            onClick={() => void submit(true)}
          >
            先跳过
          </button>
        ) : null}
      </div>
    </div>
  );
}
