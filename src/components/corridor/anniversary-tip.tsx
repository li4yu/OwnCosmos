import Link from "next/link";
import type { AnniversaryHit } from "@/services/review";
import { PoeticName } from "@/components/ui/poetic-name";

type AnniversaryTipProps = {
  hits: AnniversaryHit[];
};

/** 今时际 · 同年回望轻提示 */
export function AnniversaryTip({ hits }: AnniversaryTipProps) {
  if (hits.length === 0) return null;

  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
            <PoeticName
              name="同年回望"
              tip="往年同一天留下的馆藏痕迹"
            />
          </h2>
          <p className="mt-0.5 text-xs text-[var(--mist)]">
            往年今日，你曾留下这些记录
          </p>
        </div>
        <Link
          href="/app/past/corridor"
          className="ui-hover-link-accent font-mono text-[10px] tracking-wide text-[var(--amber)]"
        >
          往迹廊 →
        </Link>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {hits.map((h) => (
          <li key={h.id}>
            <Link
              href={`/app/past/gallery/${h.id}`}
              className="ui-hover-card flex flex-wrap items-baseline justify-between gap-2 rounded border border-transparent px-1 py-0.5 text-xs hover:bg-[var(--ink)]/30"
            >
              <span className="text-[var(--paper)]">{h.title}</span>
              <span className="font-mono text-[10px] text-[var(--mist)]">
                {h.year} · {h.typeLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
