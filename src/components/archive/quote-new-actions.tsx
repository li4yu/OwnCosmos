"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  quoteArchiveAsEssayAction,
  quoteArchiveAsPlanAction,
} from "@/app/app/past/quote-actions";
import { collectArchiveMaterialAction } from "@/app/app/materials/actions";

type QuoteNewActionsProps = {
  archiveItemId: string;
};

/** 馆藏：引用新建随笔/计划；收藏到素材匣 */
export function QuoteNewActions({ archiveItemId }: QuoteNewActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(kind: "essay" | "plan" | "material") {
    setError(null);
    startTransition(async () => {
      if (kind === "essay") {
        const r = await quoteArchiveAsEssayAction(archiveItemId);
        if (r.error || !r.essayId) {
          setError(r.error ?? "创建失败");
          return;
        }
        router.push(`/app/present/essays/${r.essayId}?saved=1`);
        return;
      }
      if (kind === "plan") {
        const r = await quoteArchiveAsPlanAction(archiveItemId);
        if (r.error || !r.planId) {
          setError(r.error ?? "创建失败");
          return;
        }
        router.push(`/app/future/plans/${r.planId}?saved=1`);
        return;
      }
      const r = await collectArchiveMaterialAction(archiveItemId);
      if (r.error) {
        setError(r.error);
        return;
      }
      router.push("/app/materials");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          className="ui-btn-ghost ui-btn-sm"
          disabled={pending}
          onClick={() => run("essay")}
        >
          引用新建随笔
        </button>
        <button
          type="button"
          className="ui-btn-ghost ui-btn-sm"
          disabled={pending}
          onClick={() => run("plan")}
        >
          引用新建计划
        </button>
        <button
          type="button"
          className="ui-btn-ghost ui-btn-sm"
          disabled={pending}
          onClick={() => run("material")}
        >
          收入素材匣
        </button>
      </div>
      {error ? (
        <p className="text-xs text-[var(--danger, #c45)]">{error}</p>
      ) : null}
    </div>
  );
}
