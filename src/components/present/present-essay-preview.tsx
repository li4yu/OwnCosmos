import Link from "next/link";
import { moodDisplay } from "@/lib/moods";

export type PresentEssayPreviewItem = {
  id: string;
  title: string;
  body: string;
  updatedAt: Date;
  mood: string | null;
};

type PresentEssayPreviewProps = {
  items: PresentEssayPreviewItem[];
};

function formatUpdated(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** 今时际 · 流动随笔快览 */
export function PresentEssayPreview({ items }: PresentEssayPreviewProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs tracking-[0.1em] text-[var(--paper)]">
          流动随笔
        </h3>
        <Link
          href="/app/present/essays"
          className="ui-hover-link-accent font-mono text-[9px] text-[var(--amber)]"
        >
          全部 →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="mt-3 flex flex-1 flex-col justify-center gap-2">
          <p className="text-xs text-[var(--mist)]">
            还没有流动中的随笔。记下此刻，再慢慢沉淀。
          </p>
          <Link
            href="/app/present/essays/new"
            className="ui-btn-primary ui-btn-sm w-fit"
          >
            写一篇
          </Link>
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/app/present/essays/${item.id}`}
                className="ui-hover-card block rounded border border-[var(--line)] px-2 py-1.5 transition"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-[var(--paper)]">
                    {item.title || "无标题"}
                  </span>
                  <time className="shrink-0 font-mono text-[9px] text-[var(--mist)]">
                    {formatUpdated(item.updatedAt)}
                  </time>
                </div>
                {item.mood ? (
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--teal)]">
                    {moodDisplay(item.mood)}
                  </p>
                ) : null}
                <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--mist)]">
                  {item.body.trim() || "（无正文）"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
