"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  cancelPlanTaskCheckinAction,
  checkinPlanTaskAction,
  createPlanTaskAction,
  deletePlanTaskAction,
} from "@/app/app/future/actions";

export type PlanTaskItem = {
  id: string;
  title: string;
  checkCount?: number;
  checkedInToday?: boolean;
  status?: string;
};

type Props = {
  planId: string;
  tasks: PlanTaskItem[];
  readOnly?: boolean;
};

function taskProgressLabel(tasks: PlanTaskItem[]) {
  if (tasks.length === 0) return "无子任务";
  const punches = tasks.reduce((sum, t) => sum + (t.checkCount ?? 0), 0);
  return `${tasks.length} 项 · 共 ${punches} 次`;
}

export function PlanTaskPanel({ planId, tasks, readOnly }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const progressLabel = taskProgressLabel(items);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  function refresh() {
    router.refresh();
  }

  function addTask() {
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    setError(null);
    const fd = new FormData();
    fd.set("title", trimmed);
    startTransition(async () => {
      const result = await createPlanTaskAction(planId, fd);
      if (result.error || !result.createdId) {
        setError(result.error ?? "无法添加子任务");
        return;
      }
      setItems((prev) => [
        ...prev,
        {
          id: result.createdId!,
          title: trimmed,
          checkCount: 0,
          checkedInToday: false,
        },
      ]);
      setTitle("");
      refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--field-bg)]/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm text-[var(--paper)]">子任务</p>
          <p className="mt-0.5 text-xs text-[var(--mist)]">
            每天可打卡一次，只记次数；与「完成本期」无关
          </p>
        </div>
        <p className="font-mono text-[10px] tracking-wide text-[var(--teal)]">
          {progressLabel}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--mist)]">
          还没有子任务。可拆成每日打卡记次的小项。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((task) => {
            const count = task.checkCount ?? 0;
            const already = Boolean(task.checkedInToday);
            return (
              <li
                key={task.id}
                className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
              >
                <span className="min-w-0 flex-1 text-sm text-[var(--paper)]">
                  {task.title}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--teal)]">
                  {count} 次
                  {already ? " · 今日已打" : ""}
                </span>
                {!readOnly ? (
                  <>
                    {already ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="ui-btn-ghost !w-auto px-2.5 py-1 text-xs"
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
                            setItems((prev) =>
                              prev.map((t) =>
                                t.id === task.id
                                  ? {
                                      ...t,
                                      checkCount: result.checkCount,
                                      checkedInToday: false,
                                    }
                                  : t,
                              ),
                            );
                            refresh();
                          });
                        }}
                      >
                        取消打卡
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        className="ui-btn-primary !w-auto px-2.5 py-1 text-xs"
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
                            setItems((prev) =>
                              prev.map((t) =>
                                t.id === task.id
                                  ? {
                                      ...t,
                                      checkCount: result.checkCount,
                                      checkedInToday: true,
                                    }
                                  : t,
                              ),
                            );
                            refresh();
                          });
                        }}
                      >
                        打卡
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      className="text-xs text-[var(--danger)]"
                      onClick={() => {
                        setError(null);
                        startTransition(async () => {
                          const result = await deletePlanTaskAction(
                            planId,
                            task.id,
                          );
                          if (result.error) {
                            setError(result.error);
                            return;
                          }
                          setItems((prev) =>
                            prev.filter((t) => t.id !== task.id),
                          );
                          refresh();
                        });
                      }}
                    >
                      删
                    </button>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              addTask();
            }}
            placeholder="添加子任务…"
            maxLength={120}
            className="auth-field min-w-[12rem] flex-1"
          />
          <button
            type="button"
            disabled={pending || !title.trim()}
            className="ui-btn-ghost px-3 py-2 text-sm"
            onClick={addTask}
          >
            添加
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
