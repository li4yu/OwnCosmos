"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  quickCancelHabitCheckinAction,
  quickCheckinCycleAction,
  quickCheckinHabitAction,
} from "@/app/app/future/actions";
import { CheckinNoteDialog } from "@/components/home/checkin-note-dialog";
import { CycleTasksInline } from "@/components/plans/cycle-tasks-inline";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NoticeDialog } from "@/components/ui/notice-dialog";
import { PoeticName } from "@/components/ui/poetic-name";
import type { HomeCheckinItem } from "@/services/home-summary";

type Props = {
  items: HomeCheckinItem[];
  dailyDone: number;
  dailyTotal: number;
};

export function HomeCheckinBoard({ items, dailyDone, dailyTotal }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dailyTarget, setDailyTarget] = useState<HomeCheckinItem | null>(null);
  const [cycleTarget, setCycleTarget] = useState<HomeCheckinItem | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(
    null,
  );

  const total = items.length;
  const progressMax = Math.max(dailyTotal, 1);
  const progressNow = Math.min(dailyDone, dailyTotal);

  function runCycleComplete(item: HomeCheckinItem) {
    startTransition(async () => {
      const result = await quickCheckinCycleAction(item.id, "");
      if (result.error) {
        setNotice({ title: "无法完成本期", message: result.error });
        setCycleTarget(null);
        return;
      }
      setCycleTarget(null);
      router.refresh();
    });
  }

  return (
    <section className="home-v1__daily home-v1__pane" aria-label="今日打卡">
      <div className="home-v1__split-head">
        <h2>
          <PoeticName
            name="今日打卡"
            tip="日课可写心得；轮期到期可完成本期；轮期子任务打卡只记次数，与完成本期无关"
          />
        </h2>
        <div className="home-v1__split-head-meta">
          <Link href="/app/future/daily" className="home-v1__daily-link">
            日课
          </Link>
          <Link href="/app/future/cycles" className="home-v1__daily-link">
            轮期
          </Link>
          <span className="font-mono text-xs tracking-wide text-[var(--mist)]">
            {dailyTotal > 0
              ? `日课 ${dailyDone}/${dailyTotal}`
              : total > 0
                ? `${total} 项`
                : "暂无"}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="home-v1__daily-panel">
          <p className="home-v1__daily-panel-hint">
            还没有今日可打的日课或轮期
          </p>
          <div className="home-v1__daily-empty flex flex-wrap gap-2">
            <Link
              href="/app/future/daily"
              className="ui-btn-primary ui-btn-sm !w-auto"
            >
              添加日课
            </Link>
            <Link
              href="/app/future/plans/new?kind=cycle"
              className="ui-btn-ghost ui-btn-sm"
            >
              新建轮期
            </Link>
          </div>
        </div>
      ) : (
        <div className="home-v1__daily-panel">
          <div
            className="home-v1__daily-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progressMax}
            aria-valuenow={progressNow}
            aria-label="今日打卡进度（日课）"
          >
            <span
              className="home-v1__daily-bar-fill"
              style={{
                width: `${Math.round((progressNow / progressMax) * 100)}%`,
              }}
            />
          </div>
          <ul className="home-v1__daily-list">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <div
                  className={`home-v1__daily-item home-v1__daily-item--row${
                    item.checkedIn ? " home-v1__daily-item--done" : ""
                  }`}
                >
                  <span className="home-v1__daily-mark" aria-hidden="true">
                    {item.checkedIn
                      ? "✓"
                      : item.kind === "cycle"
                        ? "↻"
                        : "○"}
                  </span>
                  <div className="home-v1__daily-item-body min-w-0 flex-1">
                    <span className="home-v1__daily-title">{item.title}</span>
                    <span className="home-v1__daily-note">{item.subtitle}</span>
                    {item.checkedIn && item.note.trim() ? (
                      <span className="home-v1__daily-note">
                        {item.note.trim()}
                      </span>
                    ) : null}
                    {item.kind === "cycle" && item.childTasks ? (
                      <CycleTasksInline
                        planId={item.id}
                        tasks={item.childTasks}
                        compact
                      />
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={pending || !item.canCheckin}
                      className="ui-btn-primary !w-auto px-3 py-1.5 text-xs"
                      onClick={() => {
                        if (item.kind === "cycle") {
                          setCycleTarget(item);
                          return;
                        }
                        setDailyTarget(item);
                      }}
                    >
                      {item.kind === "cycle"
                        ? "完成本期"
                        : item.checkedIn
                          ? "改心得"
                          : "打卡"}
                    </button>
                    {item.kind === "daily" && item.checkedIn ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="ui-btn-ghost ui-btn-sm"
                        onClick={() => {
                          startTransition(async () => {
                            const result = await quickCancelHabitCheckinAction(
                              item.id,
                            );
                            if (result.error) {
                              setNotice({
                                title: "无法取消",
                                message: result.error,
                              });
                              return;
                            }
                            router.refresh();
                          });
                        }}
                      >
                        取消打卡
                      </button>
                    ) : null}
                    <Link
                      href={item.href}
                      className="ui-btn-ghost ui-btn-sm text-center"
                    >
                      详情
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CheckinNoteDialog
        open={Boolean(dailyTarget)}
        title={dailyTarget?.title ?? "打卡"}
        hint="打卡后同步计入拾忆馆藏·日课归档"
        confirmLabel="打卡"
        initialNote={dailyTarget?.note ?? ""}
        pending={pending}
        onCancel={() => {
          if (!pending) setDailyTarget(null);
        }}
        onConfirm={(note) => {
          if (!dailyTarget) return;
          const current = dailyTarget;
          startTransition(async () => {
            const result = await quickCheckinHabitAction(current.id, note);
            if (result.error) {
              setNotice({ title: "打卡失败", message: result.error });
              return;
            }
            setDailyTarget(null);
            router.refresh();
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(cycleTarget)}
        title="完成本期？"
        message="将计次归档并开启下一期。轮期无需填写心得。"
        confirmLabel="完成本期"
        cancelLabel="取消"
        pending={pending}
        onCancel={() => {
          if (!pending) setCycleTarget(null);
        }}
        onConfirm={() => {
          if (cycleTarget) runCycleComplete(cycleTarget);
        }}
      />

      <NoticeDialog
        open={Boolean(notice)}
        title={notice?.title ?? "提示"}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />
    </section>
  );
}
