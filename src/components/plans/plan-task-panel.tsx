"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createPlanTaskAction,
  deletePlanTaskAction,
  setPlanTaskStatusAction,
} from "@/app/app/future/actions";
import {
  PLAN_TASK_STATUS_DONE,
  PLAN_TASK_STATUS_OPEN,
} from "@/db/schema";

export type PlanTaskItem = {
  id: string;
  title: string;
  status: string;
};

type Props = {
  planId: string;
  tasks: PlanTaskItem[];
  readOnly?: boolean;
};

function taskProgressLabel(tasks: PlanTaskItem[]) {
  if (tasks.length === 0) return "无子任务";
  const done = tasks.filter((t) => t.status === PLAN_TASK_STATUS_DONE).length;
  return `${done}/${tasks.length}`;
}

export function PlanTaskPanel({ planId, tasks, readOnly }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const progressLabel = taskProgressLabel(tasks);

  function refresh() {
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--field-bg)]/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-[var(--paper)]">子任务</p>
        <p className="font-mono text-[10px] tracking-wide text-[var(--teal)]">
          {progressLabel}
        </p>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--mist)]">还没有子任务，可拆成可勾选项。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => {
            const done = task.status === PLAN_TASK_STATUS_DONE;
            return (
              <li
                key={task.id}
                className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
              >
                <button
                  type="button"
                  disabled={readOnly || pending}
                  aria-pressed={done}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const next = done
                        ? PLAN_TASK_STATUS_OPEN
                        : PLAN_TASK_STATUS_DONE;
                      const result = await setPlanTaskStatusAction(
                        planId,
                        task.id,
                        next,
                      );
                      if (result.error) setError(result.error);
                      refresh();
                    });
                  }}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] ${
                    done
                      ? "border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,var(--panel))]"
                      : "border-[var(--line)] text-transparent"
                  }`}
                >
                  ✓
                </button>
                <span
                  className={`min-w-0 flex-1 text-sm ${
                    done
                      ? "text-[var(--mist)] line-through"
                      : "text-[var(--paper)]"
                  }`}
                >
                  {task.title}
                </span>
                {!readOnly ? (
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
                        if (result.error) setError(result.error);
                        refresh();
                      });
                    }}
                  >
                    删
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            setError(null);
            startTransition(async () => {
              const result = await createPlanTaskAction(planId, fd);
              if (result.error) {
                setError(result.error);
                return;
              }
              setTitle("");
              refresh();
            });
          }}
        >
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="添加子任务…"
            maxLength={120}
            className="auth-field min-w-[12rem] flex-1"
          />
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="ui-btn-ghost px-3 py-2 text-sm"
          >
            添加
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
