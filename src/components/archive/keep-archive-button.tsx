"use client";

import { useState, useTransition } from "react";
import { keepArchiveAction } from "@/app/app/past/actions";
import { HoverTip } from "@/components/ui/hover-tip";
import { PoeticName } from "@/components/ui/poetic-name";

type KeepArchiveButtonProps = {
  itemId: string;
  kept: boolean;
  canKeep: boolean;
};

export function KeepArchiveButton({
  itemId,
  kept,
  canKeep,
}: KeepArchiveButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isKept, setIsKept] = useState(kept);

  function toggle() {
    if (!canKeep && !isKept) return;
    setError(null);
    const next = !isKept;
    startTransition(async () => {
      const result = await keepArchiveAction(itemId, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsKept(next);
    });
  }

  const disabledTip =
    !canKeep && !isKept ? "纯图无文字，无法进知识库" : null;

  const button = (
    <button
      type="button"
      className={isKept ? "ui-btn-ghost ui-btn-sm" : "ui-btn-primary ui-btn-sm"}
      disabled={pending || (!canKeep && !isKept)}
      onClick={toggle}
    >
      <PoeticName
        name={isKept ? "移出知识库" : "进知识库"}
        tip={
          isKept
            ? "从知识库移出；条目仍留在馆藏"
            : "将这条文本导入知识库，表示值得长期珍藏"
        }
        nestInControl
      />
    </button>
  );

  return (
    <div className="flex flex-col items-start gap-1">
      {disabledTip ? (
        <HoverTip tip={disabledTip} variant="hint" nestInControl className="inline-flex">
          {button}
        </HoverTip>
      ) : (
        button
      )}
      {!canKeep && !isKept ? (
        <p className="font-mono text-xs text-[var(--mist)]">
          纯图无文字，不可进知识库
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-[var(--danger, #c45)]">{error}</p>
      ) : null}
    </div>
  );
}
