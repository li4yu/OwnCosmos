"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  cancelPlanTaskCheckinAction,
  checkinPlanTaskAction,
} from "@/app/app/future/actions";
import { requestCheckinCheerBubble } from "@/lib/companion-client";

export type CycleTaskInlineItem = {
  id: string;
  title: string;
  checkCount: number;
  /** 今日是否已打卡 */
  checkedInToday?: boolean;
};

type Props = {
  planId: string;
  tasks: CycleTaskInlineItem[];
  /** 紧凑样式（列表卡片内） */
  compact?: boolean;
};

/** 周期计划下的子任务：展示次数，每日可打卡一次 */
export function CycleTasksInline({ planId, tasks, compact }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState(() =>
    Object.fromEntries(tasks.map((t) => [t.id, t.checkCount])),
  );
  const [doneToday, setDoneToday] = useState(() =>
    Object.fromEntries(tasks.map((t) => [t.id, Boolean(t.checkedInToday)])),
  );

  useEffect(() => {
    setCounts(Object.fromEntries(tasks.map((t) => [t.id, t.checkCount])));
    setDoneToday(
      Object.fromEntries(tasks.map((t) => [t.id, Boolean(t.checkedInToday)])),
    );
  }, [tasks]);

  if (tasks.length === 0) {
    if (compact) return null;
    return <p className="text-sm text-[var(--mist)]">暂无子任务</p>;
  }

  return (
    <div className={compact ? "mt-3" : ""}>
      <p
        className={`font-mono tracking-wide text-[var(--mist)] ${
          compact ? "mb-1.5 text-xs" : "mb-2 text-xs"
        }`}
      >
        子任务 · 每天可打一次
      </p>
      <ul className="flex flex-col gap-1.5">
        {tasks.map((task) => {
          const count = counts[task.id] ?? task.checkCount;
          const already = doneToday[task.id] ?? Boolean(task.checkedInToday);
          return (
            <li
              key={task.id}
              className="flex items-center gap-2 rounded-md border border-[var(--line)]/80 bg-[var(--field-bg)]/30 px-2.5 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--paper)]">
                {task.title}
              </span>
              <span className="shrink-0 font-mono text-xs text-[var(--teal)]">
                {count} 次
                {already ? " · 今日已打" : ""}
              </span>
              {already ? (
                <button
                  type="button"
                  disabled={pending}
                  className="ui-btn-ghost shrink-0 px-2 py-1 text-[13px]"
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await cancelPlanTaskCheckinAction(
                        planId,
                        task.id,
                      );
                      if (result.error || result.checkCount == null) {
                        setError(result.error ?? "取消失败");
                        return;
                      }
                      setCounts((prev) => ({
                        ...prev,
                        [task.id]: result.checkCount!,
                      }));
                      setDoneToday((prev) => ({ ...prev, [task.id]: false }));
                      router.refresh();
                    });
                  }}
                >
                  取消打卡
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  className="ui-btn-ghost shrink-0 px-2 py-1 text-[13px]"
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await checkinPlanTaskAction(
                        planId,
                        task.id,
                      );
                      if (result.error || result.checkCount == null) {
                        setError(result.error ?? "打卡失败");
                        return;
                      }
                      setCounts((prev) => ({
                        ...prev,
                        [task.id]: result.checkCount!,
                      }));
                      setDoneToday((prev) => ({ ...prev, [task.id]: true }));
                      void requestCheckinCheerBubble(task.title);
                      router.refresh();
                    });
                  }}
                >
                  打卡
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
