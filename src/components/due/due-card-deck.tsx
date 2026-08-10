"use client";

import { useCallback, useEffect, useState } from "react";
import { DuePlanCard } from "@/components/due/due-plan-card";
import type { DueReminderListItem } from "@/components/due/due-reminder-section";
import { remainingDaysLabel } from "@/lib/due-labels";

type DueCardDeckProps = {
  items: DueReminderListItem[];
  /** 方卡上是否显示完整操作（完成/延期/随想） */
  showActions?: boolean;
};

const PEEK = 2;

/** 临期提醒 · 方形层叠翻阅 */
export function DueCardDeck({
  items,
  showActions = true,
}: DueCardDeckProps) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"next" | "prev" | null>(null);

  useEffect(() => {
    if (index > items.length - 1) {
      setIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, index]);

  const go = useCallback(
    (next: "next" | "prev") => {
      setDir(next);
      setIndex((i) => {
        if (next === "next") return Math.min(items.length - 1, i + 1);
        return Math.max(0, i - 1);
      });
      window.setTimeout(() => setDir(null), 280);
    },
    [items.length],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go("next");
      if (e.key === "ArrowLeft") go("prev");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (items.length === 0) return null;

  const front = items[index]!;
  const peekItems = items.slice(index + 1, index + 1 + PEEK);

  return (
    <div className="due-deck">
      <div className="due-deck__stage">
        {peekItems
          .map((item, peekIdx) => {
            const depth = peekIdx + 1;
            return (
              <div
                key={item.id}
                className="due-deck__peek"
                style={{
                  zIndex: 10 - depth,
                  transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.045})`,
                  opacity: 1 - depth * 0.22,
                }}
                aria-hidden
              >
                <div className="due-deck__peek-face">
                  <p className="due-deck__peek-title">{item.title}</p>
                  <p className="due-deck__peek-days">
                    {remainingDaysLabel(item.daysLeft)}
                  </p>
                </div>
              </div>
            );
          })
          .reverse()}

        <div
          key={front.id}
          className={`due-deck__front${
            dir === "next"
              ? " due-deck__front--out-left"
              : dir === "prev"
                ? " due-deck__front--in-right"
                : ""
          }`}
          style={{ zIndex: 20 }}
        >
          <DuePlanCard
            id={front.id}
            title={front.title}
            dueAt={front.dueAt}
            daysLeft={front.daysLeft}
            remindDays={front.remindDays}
            kindLabel={front.kindLabel}
            layout="square"
            showActions={showActions}
          />
        </div>
      </div>

      <div className="due-deck__controls">
        <button
          type="button"
          className="ui-btn-ghost ui-btn-sm"
          disabled={index <= 0}
          onClick={() => go("prev")}
        >
          上一帖
        </button>
        <p className="due-deck__pager font-mono text-xs text-[var(--mist)]">
          {index + 1} / {items.length}
        </p>
        <button
          type="button"
          className="ui-btn-ghost ui-btn-sm"
          disabled={index >= items.length - 1}
          onClick={() => go("next")}
        >
          下一帖
        </button>
      </div>

      {items.length > 1 ? (
        <div className="due-deck__dots" role="tablist" aria-label="临期提醒翻页">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`due-deck__dot${i === index ? " due-deck__dot--active" : ""}`}
              onClick={() => {
                setDir(i > index ? "next" : i < index ? "prev" : null);
                setIndex(i);
                window.setTimeout(() => setDir(null), 280);
              }}
              aria-label={`第 ${i + 1} 帖`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
