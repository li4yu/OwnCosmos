"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  checkinHabitAction,
  createHabitAction,
  deactivateHabitAction,
  type DailyActionState,
} from "@/app/app/future/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NoticeDialog } from "@/components/ui/notice-dialog";

export type HabitRow = {
  id: string;
  title: string;
  body: string;
  checkedIn: boolean;
  note: string;
};

type Props = {
  habits: HabitRow[];
  todayLabel: string;
};

const emptyCreate: DailyActionState = {};

export function DailyHabits({ habits, todayLabel }: Props) {
  const router = useRouter();
  const [createState, createAction, createPending] = useActionState(
    createHabitAction,
    emptyCreate,
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(habits.map((h) => [h.id, h.note])),
  );
  const [pending, startTransition] = useTransition();
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    setNotes(Object.fromEntries(habits.map((h) => [h.id, h.note])));
  }, [habits]);

  useEffect(() => {
    if (createState.error) {
      setNotice({ title: "无法创建", message: createState.error });
      return;
    }
    if (createState.ok) {
      setNotice(null);
      setTitle("");
      setBody("");
      router.refresh();
    }
  }, [createState, router]);

  const doneCount = habits.filter((h) => h.checkedIn).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
          今日日课
          <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
            {doneCount}/{habits.length}
          </span>
        </h2>
        <p className="font-mono text-[10px] tracking-wide text-[var(--teal)]">
          {todayLabel}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        <li className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--field-bg)]/30 p-4">
          <form
            action={createAction}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-sm text-[var(--mist)]">
              新日课
              <input
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="auth-field"
                placeholder="例如：晨间拉伸"
                maxLength={80}
                aria-label="日课名称"
              />
            </label>
            <label className="flex min-w-[10rem] flex-[1.2] flex-col gap-1.5 text-sm text-[var(--mist)]">
              说明（可选）
              <input
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="auth-field"
                placeholder="想坚持的事…"
                maxLength={200}
                aria-label="日课说明"
              />
            </label>
            <button
              type="submit"
              disabled={createPending || !title.trim()}
              className="ui-btn-primary !w-auto shrink-0 px-4 py-2.5 text-xs sm:mb-0.5"
            >
              {createPending ? "添加中…" : "添加到列表"}
            </button>
          </form>
        </li>

        {habits.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--line)] px-4 py-5 text-center text-sm text-[var(--mist)]">
            还没有日课。在上方添加一条后会出现在这里。
          </li>
        ) : (
          habits.map((habit) => (
            <li
              key={habit.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base text-[var(--paper)]">{habit.title}</h3>
                  {habit.body.trim() ? (
                    <p className="mt-1 text-sm text-[var(--mist)]">{habit.body}</p>
                  ) : null}
                </div>
                <span
                  className={`font-mono text-[10px] tracking-wide ${
                    habit.checkedIn ? "text-[var(--teal)]" : "text-[var(--amber)]"
                  }`}
                >
                  {habit.checkedIn ? "已打卡" : "未打卡"}
                </span>
              </div>
              <form
                className="mt-3 flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const result = await checkinHabitAction(habit.id, {}, fd);
                    if (result.error) {
                      setNotice({ title: "打卡失败", message: result.error });
                      return;
                    }
                    router.refresh();
                  });
                }}
              >
                <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
                  一句心得（可选）
                  <input
                    name="note"
                    value={notes[habit.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [habit.id]: e.target.value,
                      }))
                    }
                    className="auth-field"
                    placeholder="今天练得怎样…"
                    maxLength={200}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="ui-btn-primary !w-auto px-4 py-2 text-xs"
                  >
                    {habit.checkedIn ? "更新打卡" : "打卡"}
                  </button>
                  <button
                    type="button"
                    className="ui-btn-ghost px-3 py-2 text-xs text-[var(--danger)]"
                    onClick={() => setRemoveId(habit.id)}
                  >
                    停用
                  </button>
                </div>
              </form>
            </li>
          ))
        )}
      </ul>

      <ConfirmDialog
        open={Boolean(removeId)}
        title="停用这条日课？"
        message="停用后不再出现在今日列表；历史打卡仍保留。"
        confirmLabel="停用"
        cancelLabel="取消"
        tone="danger"
        pending={pending}
        onCancel={() => {
          if (!pending) setRemoveId(null);
        }}
        onConfirm={() => {
          if (!removeId) return;
          startTransition(async () => {
            const result = await deactivateHabitAction(removeId);
            if (result.error) {
              setNotice({ title: "无法停用", message: result.error });
              setRemoveId(null);
              return;
            }
            setRemoveId(null);
            router.refresh();
          });
        }}
      />

      <NoticeDialog
        open={Boolean(notice)}
        title={notice?.title ?? "提示"}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />
    </div>
  );
}
