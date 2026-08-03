import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";

const entries = [
  {
    href: "/app/present/essays/daily",
    name: "每日随笔",
    tip: "随手记下当下灵感；久未改动会自动沉淀进馆藏",
    cta: "进入 →",
  },
  {
    href: "/app/present/essays/topics",
    name: "专题随笔",
    tip: "按主题建夹写多篇；整专题归档进馆藏，单篇不可单独归档",
    cta: "进入 →",
  },
] as const;

export default async function EssaysHubPage() {
  await requireSession();

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="流思笺"
        backHref="/app/present"
        backLabel="返回今时际"
        description={
          <>
            <PoeticName
              name="流思笺"
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
              <span className="shrink-0 text-xs tracking-[0.08em] text-[var(--amber)]">
                {entry.cta}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
