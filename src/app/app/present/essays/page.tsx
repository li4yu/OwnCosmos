import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { HoverTip } from "@/components/ui/hover-tip";
import { IconChevronRight } from "@/components/ui/icon-glyphs";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";

const entries = [
  {
    href: "/app/present/essays/daily",
    name: "每日随笔",
    tip: "随手记下当下灵感；久未改动会自动沉淀进馆藏",
  },
  {
    href: "/app/present/essays/topics",
    name: "专题随笔",
    tip: "按主题建夹写多篇；整专题归档进馆藏，单篇不可单独归档",
  },
] as const;

export default async function EssaysHubPage() {
  await requireSession();

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="随笔"
        backHref="/app/present"
        backLabel="返回今时际"
        description={
          <>
            <PoeticName
              name="随笔"
              tip="快速记下当下灵感与草稿，未归档前可随时改"
            />
            · 分「每日」与「专题」两处写
          </>
        }
      />

      <ul className="oc-hub">
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link href={entry.href}>
              <div className="min-w-0">
                <h2 className="oc-scroll__title text-[1rem]">
                  <PoeticName name={entry.name} tip={entry.tip} />
                </h2>
                <p className="oc-scroll__body line-clamp-1">{entry.tip}</p>
              </div>
              <HoverTip
                tip="进入"
                variant="hint"
                nestInControl
                className="inline-flex shrink-0"
              >
                <span className="text-[var(--amber)]" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </HoverTip>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
