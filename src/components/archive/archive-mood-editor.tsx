"use client";

import { useState, useTransition } from "react";
import { MoodPicker } from "@/components/tags/mood-picker";
import { setArchiveMoodAction } from "@/app/app/past/actions";

type ArchiveMoodEditorProps = {
  itemId: string;
  initialMood: string | null;
};

/** 馆藏详情 · 补改情绪标记 */
export function ArchiveMoodEditor({
  itemId,
  initialMood,
}: ArchiveMoodEditorProps) {
  const [mood, setMood] = useState(initialMood ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: string) {
    setMood(next);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await setArchiveMoodAction(itemId, next || null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(next ? "情绪标记已更新" : "已清除情绪标记");
    });
  }

  return (
    <div className="mt-3 rounded border border-[var(--line)] px-2.5 py-2">
      <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
        情绪标记
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--mist)]">
        正文只读；心情可在此补改，并计入情绪复盘
      </p>
      <div className="mt-1.5">
        <MoodPicker value={mood} onChange={save} label="心情" />
      </div>
      {pending ? (
        <p className="mt-1 text-[11px] text-[var(--mist)]">保存中…</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-[11px] text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-1 text-[11px] text-[var(--teal)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
