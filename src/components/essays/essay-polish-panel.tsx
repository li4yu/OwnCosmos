"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  POLISH_STYLE_OPTIONS,
  POLISH_STYLE_SMOOTH,
  type PolishScope,
  type PolishStyle,
} from "@/ai/polish";
import type { EssayRichEditorHandle } from "@/components/essays/essay-rich-editor";

type Props = {
  open: boolean;
  editorRef: RefObject<EssayRichEditorHandle | null>;
  onClose: () => void;
  onAccepted: () => void;
};

export function EssayPolishPanel({
  open,
  editorRef,
  onClose,
  onAccepted,
}: Props) {
  const [scope, setScope] = useState<PolishScope>("selection");
  const [style, setStyle] = useState<PolishStyle>(POLISH_STYLE_SMOOTH);
  const [source, setSource] = useState("");
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<{ from: number; to: number } | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraft("");
    const ed = editorRef.current;
    const selected = ed?.getSelectedPlainText()?.trim() || "";
    const selRange = ed?.getSelectionRange() ?? null;
    if (selected && selRange) {
      setScope("selection");
      setSource(selected);
      setRange(selRange);
    } else {
      setScope("full");
      setSource(ed?.getFullPlainText()?.trim() || "");
      setRange(null);
    }
  }, [open, editorRef]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }

  async function runPolish() {
    const text = source.trim();
    if (!text) {
      setError(
        scope === "selection"
          ? "请先在正文中选中一段文字"
          : "正文为空，无法润色",
      );
      return;
    }
    stop();
    setError(null);
    setDraft("");
    setStreaming(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/ai/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, scope, style }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `请求失败 ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let out = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          try {
            const ev = JSON.parse(payload) as {
              type?: string;
              text?: string;
              error?: string;
            };
            if (ev.type === "delta" && typeof ev.text === "string") {
              out += ev.text;
              setDraft(out);
            } else if (ev.type === "error") {
              throw new Error(ev.error || "润色失败");
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
      if (!out.trim()) setError("没有生成内容");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "润色失败");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function accept() {
    const text = draft.trim();
    if (!text) return;
    const ed = editorRef.current;
    if (!ed) return;
    if (scope === "selection") {
      let ok = false;
      if (range) {
        ok = ed.replaceRangeWithPlain(range.from, range.to, text);
      }
      if (!ok) {
        ok = ed.replaceSelectionWithPlain(text);
      }
      if (!ok) {
        setError("选区已失效，请重新选择后再润色，或改用全文润色");
        return;
      }
    } else {
      ed.replaceFullWithPlain(text);
    }
    onAccepted();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal
      aria-label="随笔润色"
    >
      <div className="flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-[var(--dialog-shadow)]">
        <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-[var(--paper)]">AI 润色</p>
            <p className="text-xs text-[var(--mist)]">
              预览后点采纳才写回；不采纳则正文不变
            </p>
          </div>
          <button
            type="button"
            className="ui-btn-ghost px-2 py-1 text-xs"
            onClick={() => {
              stop();
              onClose();
            }}
          >
            关闭
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={streaming}
              className={`rounded border px-2.5 py-1 text-xs ${
                scope === "selection"
                  ? "border-[var(--teal)] text-[var(--teal)]"
                  : "border-[var(--line)] text-[var(--mist)]"
              }`}
              onClick={() => {
                const selected =
                  editorRef.current?.getSelectedPlainText()?.trim() || "";
                const selRange = editorRef.current?.getSelectionRange() ?? null;
                setScope("selection");
                setSource(selected);
                setRange(selRange);
                setDraft("");
                setError(
                  selected && selRange ? null : "请先在正文中选中一段文字",
                );
              }}
            >
              选区
            </button>
            <button
              type="button"
              disabled={streaming}
              className={`rounded border px-2.5 py-1 text-xs ${
                scope === "full"
                  ? "border-[var(--teal)] text-[var(--teal)]"
                  : "border-[var(--line)] text-[var(--mist)]"
              }`}
              onClick={() => {
                setScope("full");
                setSource(editorRef.current?.getFullPlainText()?.trim() || "");
                setRange(null);
                setDraft("");
                setError(null);
              }}
            >
              全文
            </button>
          </div>

          <fieldset className="flex flex-col gap-1.5" disabled={streaming}>
            <legend className="text-xs text-[var(--mist)]">风格</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {POLISH_STYLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-1.5 rounded border px-2 py-1.5 text-xs ${
                    style === opt.value
                      ? "border-[var(--teal)] bg-[var(--teal)]/10"
                      : "border-[var(--line)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="polish-style"
                    className="mt-0.5 accent-[var(--teal)]"
                    checked={style === opt.value}
                    onChange={() => setStyle(opt.value)}
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

          {scope === "full" ? (
            <p className="text-xs leading-relaxed text-[var(--mist)]">
              全文采纳后以段落纯文本写回，插图与复杂格式会丢失；保插图请用选区润色。
            </p>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--mist)]">原文</span>
            <textarea
              className="min-h-[72px] resize-y rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--paper)]"
              value={source}
              disabled={streaming}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--mist)]">润色预览</span>
            <textarea
              className="min-h-[120px] resize-y rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--paper)]"
              value={draft}
              disabled={streaming}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={streaming ? "生成中…" : "点「开始润色」后出现预览"}
            />
          </label>

          {error ? (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-[var(--line)] px-3 py-2.5">
          {streaming ? (
            <button
              type="button"
              className="ui-btn-ghost px-3 py-1.5 text-xs"
              onClick={stop}
            >
              停止
            </button>
          ) : (
            <button
              type="button"
              className="ui-btn-primary !w-auto px-4 py-1.5 text-xs"
              onClick={() => void runPolish()}
            >
              开始润色
            </button>
          )}
          <button
            type="button"
            disabled={streaming || !draft.trim()}
            className="ui-btn-ghost px-3 py-1.5 text-xs text-[var(--teal)]"
            onClick={accept}
          >
            采纳写回
          </button>
          <button
            type="button"
            className="ui-btn-ghost ml-auto px-3 py-1.5 text-xs"
            onClick={() => {
              stop();
              onClose();
            }}
          >
            丢弃
          </button>
        </footer>
      </div>
    </div>
  );
}
