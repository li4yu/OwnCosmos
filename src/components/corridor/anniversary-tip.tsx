import Link from "next/link";
import { IconActionLink } from "@/components/ui/icon-action";
import { IconChevronRight } from "@/components/ui/icon-glyphs";
import type { AnniversaryHit } from "@/services/review";
import { PoeticName } from "@/components/ui/poetic-name";

type AnniversaryTipProps = {
  hits: AnniversaryHit[];
};

/** 今时际 · 往年今日轻提示 */
export function AnniversaryTip({ hits }: AnniversaryTipProps) {
  if (hits.length === 0) return null;

  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
            <PoeticName
              name="往年今日"
              tip="往年同一天留下的馆藏痕迹"
            />
          </h2>
          <p className="mt-0.5 text-xs text-[var(--mist)]">
            往年今日，你曾留下这些记录
          </p>
        </div>
        <IconActionLink
          href="/app/past/corridor"
          label="时间线"
          className="oc-icon-action--accent"
        >
          <IconChevronRight size={14} />
        </IconActionLink>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {hits.map((h) => (
          <li key={h.id}>
            <Link
              href={`/app/past/gallery/${h.id}`}
              className="ui-hover-card flex flex-wrap items-baseline justify-between gap-2 rounded border border-transparent px-1 py-0.5 text-xs hover:bg-[var(--ink)]/30"
            >
              <span className="text-[var(--paper)]">{h.title}</span>
              <span className="font-mono text-xs text-[var(--mist)]">
                {h.year} · {h.typeLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
