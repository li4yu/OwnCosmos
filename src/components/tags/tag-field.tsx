"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createTagAction,
  deactivateTagAction,
} from "@/app/app/tags/actions";
import { PoeticName } from "@/components/ui/poetic-name";

export type TagOption = { id: string; name: string; active?: boolean };

type TagFieldProps = {
  /** 隐藏域 name，提交逗号分隔 id */
  name?: string;
  allTags: TagOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** 创建新签后回调（用于刷新列表） */
  onTagsMutated?: () => void;
};

/** 绪签多选 + 新建 / 软停用 */
export function TagField({
  name = "tagIds",
  allTags,
  selectedIds,
  onChange,
  onTagsMutated,
}: TagFieldProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const activeTags = useMemo(
    () => allTags.filter((t) => t.active !== false),
    [allTags],
  );

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function createTag() {
    const nameVal = draft.trim();
    if (!nameVal) return;
    setError(null);
    startTransition(async () => {
      const result = await createTagAction(nameVal);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.tagId) {
        onChange(
          selectedIds.includes(result.tagId)
            ? selectedIds
            : [...selectedIds, result.tagId],
        );
      }
      setDraft("");
      onTagsMutated?.();
    });
  }

  function deactivate(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deactivateTagAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onChange(selectedIds.filter((x) => x !== id));
      onTagsMutated?.();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-[var(--mist)]">
        <PoeticName
          name="绪签"
          tip="自定义标签，归档后随文带入昔时往，便于筛选"
        />
      </span>
      <input type="hidden" name={name} value={selectedIds.join(",")} />
      <div className="flex flex-wrap gap-1">
        {activeTags.length === 0 ? (
          <span className="text-xs text-[var(--mist)]">暂无绪签，可在下方新建</span>
        ) : (
          activeTags.map((t) => {
            const on = selectedIds.includes(t.id);
            return (
              <span
                key={t.id}
                className={`inline-flex items-center gap-0.5 rounded-md border text-xs ${
                  on
                    ? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--paper)]"
                    : "border-[var(--line)] text-[var(--mist)]"
                }`}
              >
                <button
                  type="button"
                  className="px-2 py-1"
                  onClick={() => toggle(t.id)}
                >
                  {t.name}
                </button>
                <button
                  type="button"
                  className="border-l border-[var(--line)] px-1.5 py-1 text-[10px] opacity-70 hover:opacity-100"
                  title="停用此绪签"
                  disabled={pending}
                  onClick={() => deactivate(t.id)}
                >
                  ×
                </button>
              </span>
            );
          })
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              createTag();
            }
          }}
          placeholder="新建绪签"
          maxLength={32}
          className="auth-field !py-1.5 max-w-[12rem] text-sm text-[var(--paper)]"
        />
        <button
          type="button"
          className="ui-btn-ghost ui-btn-sm"
          disabled={pending || !draft.trim()}
          onClick={createTag}
        >
          添加
        </button>
      </div>
      {error ? (
        <p className="text-xs text-[var(--danger, #c45)]">{error}</p>
      ) : null}
    </div>
  );
}
