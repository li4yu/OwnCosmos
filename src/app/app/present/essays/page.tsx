import Link from "next/link";
import { EssayListItem } from "@/components/essays/essay-list-item";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";
import { listActiveEssays } from "@/services/essays";

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function EssaysPage() {
  const session = await requireSession();
  const essays = await listActiveEssays(session.user.id);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="流思笺"
        description={
          <PoeticName
            name="流思笺"
            tip="快速记下当下灵感与草稿，未归档前可随时改"
          />
        }
        actions={
          <Link
            href="/app/present/essays/new"
            className="ui-btn-primary !w-auto px-4 py-2 text-xs"
          >
            新建
          </Link>
        }
      />

      {essays.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--mist)]">
          还没有流动中的思绪。点「新建」写下第一条。
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {essays.map((item) => (
            <EssayListItem
              key={item.id}
              id={item.id}
              title={item.title}
              body={item.body}
              updatedLabel={formatWhen(item.updatedAt)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
