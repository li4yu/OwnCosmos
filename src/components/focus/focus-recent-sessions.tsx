import Link from "next/link";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { galleryDetailHref } from "@/lib/gallery-sections";

export type FocusRecentItem = {
  id: string;
  title: string;
  mode: string;
  accumulatedMs: number;
  endedAt: Date | null;
  archiveItemId: string | null;
};

type FocusRecentSessionsProps = {
  items: FocusRecentItem[];
};

function formatEnded(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** 凝时 · 最近专注记录 */
export function FocusRecentSessions({ items }: FocusRecentSessionsProps) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs tracking-[0.1em] text-[var(--paper)]">
          最近专注记录
        </h3>
        <Link
          href="/app/focus/records"
          className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
        >
          全部 →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--mist)]">
          尚无完成记录。开一段正向计时或倒计时，结束后会沉淀到这里与昔时往。
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {items.map((item) => {
            const href = item.archiveItemId
              ? galleryDetailHref(item.archiveItemId, "focus-record")
              : "/app/focus/records";
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className="ui-hover-card block rounded border border-[var(--line)] px-2 py-1.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs text-[var(--paper)]">
                      {item.title}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-[var(--mist)]">
                      {item.mode === "countdown" ? "倒计时" : "正向计时"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--amber)]">
                    {formatFocusDurationMs(item.accumulatedMs)}
                    {item.endedAt ? (
                      <span className="ml-2 text-[var(--mist)]">
                        {formatEnded(item.endedAt)}
                      </span>
                    ) : null}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
