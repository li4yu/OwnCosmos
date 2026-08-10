"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {
  completeDuePlanAction,
  createYuanxiangAction,
  postponeDuePlanAction,
} from "@/app/app/present/due/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { PoeticName } from "@/components/ui/poetic-name";
import { formatDueDateInput } from "@/lib/plan-dates";
import { remainingDaysLabel } from "@/lib/due-labels";

type DueCardProps = {
  id: string;
  title: string;
  dueAt: Date;
  daysLeft: number;
  remindDays: number;
  kindLabel?: string;
  /** @deprecated 改用 layout */
  compact?: boolean;
  layout?: "row" | "square";
  showActions?: boolean;
};

export function DuePlanCard({
  id,
  title,
  dueAt,
  daysLeft,
  remindDays,
  kindLabel,
  compact = false,
  layout,
  showActions = true,
}: DueCardProps) {
  const resolvedLayout = layout ?? (compact ? "row" : "row");
  const isSquare = resolvedLayout === "square";
  const isCompact = !isSquare && compact;

  const router = useRouter();
  const yuanxiangTitleId = useId();
  const postponeTitleId = useId();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [yuanxiangOpen, setYuanxiangOpen] = useState(false);
  const [postponeDate, setPostponeDate] = useState(() =>
    formatDueDateInput(dueAt),
  );
  const [yuanxiangBody, setYuanxiangBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overdue = daysLeft < 0;
  const isToday = daysLeft === 0;

  async function confirmComplete() {
    setPending(true);
    setError(null);
    const result = await completeDuePlanAction(id);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setCompleteOpen(false);
    router.refresh();
  }

  async function confirmPostpone() {
    setPending(true);
    setError(null);
    const result = await postponeDuePlanAction(id, postponeDate);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPostponeOpen(false);
    router.refresh();
  }

  async function confirmYuanxiang() {
    setPending(true);
    setError(null);
    const result = await createYuanxiangAction(id, yuanxiangBody);
    if (result?.error || !result.essayId) {
      setError(result?.error ?? "随想失败");
      setPending(false);
      return;
    }
    setYuanxiangOpen(false);
    setYuanxiangBody("");
    setPending(false);
    router.push(`/app/present/essays/${result.essayId}`);
    router.refresh();
  }

  const borderTone = overdue
    ? "border-[var(--danger)]/50"
    : isToday
      ? "border-[var(--amber)] shadow-[0_0_0_1px_var(--amber-soft)]"
      : "border-[var(--line)]";

  return (
    <article
      className={
        isSquare
          ? `due-deck__card ${borderTone}`
          : `rounded-xl border bg-[var(--panel)] ${
              isCompact ? "p-2.5" : "p-4"
            } ${borderTone} ${overdue || isToday ? "" : "ui-hover-card"}`
      }
    >
      {isSquare ? (
        <div className="due-deck__card-body">
          <p className="font-mono text-xs tracking-[0.16em] text-[var(--teal)]">
            临期提醒
            {kindLabel ? ` · ${kindLabel}` : ""}
            {isToday ? " · 今日" : ""}
          </p>
          <h3 className="due-deck__card-title">{title}</h3>
          <p
            className={`due-deck__card-countdown ${
              overdue ? "text-[var(--danger)]" : "text-[var(--amber)]"
            }`}
          >
            {remainingDaysLabel(daysLeft)}
          </p>
          <p className="font-mono text-xs tracking-wide text-[var(--mist)]">
            截止 {formatDueDateInput(dueAt)}
            {` · 提前 ${remindDays} 天`}
          </p>
          {showActions ? (
            <div className="due-deck__card-actions">
              <button
                type="button"
                className="ui-btn-primary ui-btn-sm !w-auto"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setCompleteOpen(true);
                }}
              >
                完成
              </button>
              <button
                type="button"
                className="ui-btn-ghost ui-btn-sm"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setPostponeDate(formatDueDateInput(dueAt));
                  setPostponeOpen(true);
                }}
              >
                延期
              </button>
              <button
                type="button"
                className="ui-btn-ghost ui-btn-sm"
                disabled={pending}
                title="针对这条计划随手写下想法，会存成一条随笔"
                onClick={() => {
                  setError(null);
                  setYuanxiangBody("");
                  setYuanxiangOpen(true);
                }}
              >
                随想
              </button>
              <Link
                href={`/app/future/plans/${id}`}
                className="ui-btn-ghost ui-btn-sm text-center"
              >
                来日途
              </Link>
            </div>
          ) : null}
          {error ? (
            <p className="text-xs text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {!isCompact ? (
              <p className="font-mono text-xs tracking-[0.16em] text-[var(--teal)]">
                临期提醒 · 只读副本
                {kindLabel ? ` · ${kindLabel}` : ""}
                {isToday ? " · 今日" : ""}
              </p>
            ) : isToday ? (
              <p className="font-mono text-xs tracking-wide text-[var(--amber)]">
                今日
              </p>
            ) : null}
            <h3
              className={`tracking-[0.06em] text-[var(--paper)] ${
                isCompact ? "text-sm" : "mt-1 text-lg"
              }`}
            >
              {title}
            </h3>
            <p
              className={`font-mono tracking-wide ${
                isCompact ? "mt-0.5 text-xs" : "mt-2 text-sm"
              } ${overdue ? "text-[var(--danger)]" : "text-[var(--amber)]"}`}
            >
              {remainingDaysLabel(daysLeft)}
            </p>
            <p className="mt-0.5 font-mono text-xs tracking-wide text-[var(--mist)]">
              截止 {formatDueDateInput(dueAt)}
              {isCompact ? null : ` · 提前 ${remindDays} 天提醒`}
            </p>
          </div>
          {showActions ? (
            <div className="flex shrink-0 flex-col gap-1.5">
              <button
                type="button"
                className="ui-btn-primary !w-auto px-3 py-1.5 text-xs"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setCompleteOpen(true);
                }}
              >
                完成
              </button>
              <button
                type="button"
                className="ui-btn-ghost ui-btn-sm"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setPostponeDate(formatDueDateInput(dueAt));
                  setPostponeOpen(true);
                }}
              >
                延期
              </button>
              <button
                type="button"
                className="ui-btn-ghost ui-btn-sm"
                disabled={pending}
                title="针对这条计划随手写下想法，会存成一条随笔"
                onClick={() => {
                  setError(null);
                  setYuanxiangBody("");
                  setYuanxiangOpen(true);
                }}
              >
                随想
              </button>
              {!isCompact ? (
                <Link
                  href={`/app/future/plans/${id}`}
                  className="ui-btn-ghost ui-btn-sm text-center"
                >
                  看来日途
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {!isSquare && error ? (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={completeOpen}
        title="完成及归档？"
        message="将标记完成并沉淀入昔时往馆藏（规划归档）；来日途「已完成」仍可查看。确定吗？"
        confirmLabel="完成及归档"
        cancelLabel="取消"
        pending={pending}
        onCancel={() => {
          if (!pending) setCompleteOpen(false);
        }}
        onConfirm={() => {
          void confirmComplete();
        }}
      />

      {postponeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
            disabled={pending}
            onClick={() => {
              if (!pending) setPostponeOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={postponeTitleId}
            className="relative z-10 w-full max-w-[400px] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--dialog-shadow)]"
          >
            <h2
              id={postponeTitleId}
              className="text-lg tracking-[0.1em] text-[var(--paper)]"
            >
              延期
            </h2>
            <p className="mt-2 text-sm text-[var(--mist)]">
              将回写来日途截止日期，临期提醒按新窗口更新。
            </p>
            <div className="mt-4">
              <DatePickerField
                name="postponeDue"
                label="新截止日期"
                value={postponeDate}
                onChange={setPostponeDate}
                disabled={pending}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="ui-btn-ghost px-4 py-2"
                disabled={pending}
                onClick={() => setPostponeOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="ui-btn-primary !w-auto px-4 py-2"
                disabled={pending}
                onClick={() => {
                  void confirmPostpone();
                }}
              >
                {pending ? "保存中…" : "确认延期"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {yuanxiangOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
            disabled={pending}
            onClick={() => {
              if (!pending) setYuanxiangOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={yuanxiangTitleId}
            className="relative z-10 w-full max-w-[400px] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--dialog-shadow)]"
          >
            <p className="font-mono text-xs tracking-[0.2em] text-[var(--teal)]">
              YUANXIANG
            </p>
            <h2
              id={yuanxiangTitleId}
              className="mt-1 text-lg tracking-[0.1em] text-[var(--paper)]"
            >
              <PoeticName
                name="随想"
                tip="针对这条计划随手写下想法，会存成一条随笔"
              />
            </h2>
            <p className="mt-2 text-sm text-[var(--mist)]">
              将生成一条独立随笔，并关联本计划。
            </p>
            <label className="mt-4 flex flex-col gap-1.5 text-sm text-[var(--mist)]">
              随想
              <textarea
                value={yuanxiangBody}
                onChange={(e) => setYuanxiangBody(e.target.value)}
                rows={4}
                disabled={pending}
                className="auth-field min-h-[6rem] resize-y"
                placeholder="关于这件事的临时想法…"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="ui-btn-ghost px-4 py-2"
                disabled={pending}
                onClick={() => setYuanxiangOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="ui-btn-primary !w-auto px-4 py-2"
                disabled={pending || !yuanxiangBody.trim()}
                onClick={() => {
                  void confirmYuanxiang();
                }}
              >
                {pending ? "保存中…" : "存为随笔"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
