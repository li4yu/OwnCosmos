import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";
import { searchAll } from "@/services/search";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function GlobalSearchPage({ searchParams }: Props) {
  const session = await requireSession();
  const { q: raw } = await searchParams;
  const q = (raw ?? "").trim();
  const hits = q ? await searchAll(session.user.id, q) : [];

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="全局检索"
        eyebrow="SEARCH"
        description="同时检索随笔、来日途与馆藏（关键词）"
        backHref="/app"
        backLabel="返回首页"
      />
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <form className="flex flex-wrap gap-1.5" action="/app/search" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="输入关键词"
            className="auth-field !py-1.5 min-w-[12rem] max-w-md flex-1 text-sm text-[var(--paper)]"
          />
          <button type="submit" className="ui-btn-primary ui-btn-sm">
            检索
          </button>
        </form>
      </section>

      {!q ? (
        <p className="text-xs text-[var(--mist)]">输入关键词开始检索。</p>
      ) : hits.length === 0 ? (
        <section className="rounded-md border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--mist)]">
          未找到与「{q}」相关的内容。
        </section>
      ) : (
        <>
          <p className="font-mono text-[9px] tracking-wide text-[var(--mist)]">
            共 {hits.length} 条结果
          </p>
          <ul className="flex flex-col gap-1.5">
            {hits.map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                <Link
                  href={h.href}
                  className="block rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 transition hover:border-[var(--amber)]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm text-[var(--paper)]">{h.title}</h3>
                    <span className="font-mono text-[10px] text-[var(--teal)]">
                      {h.meta}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--mist)]">
                    {h.body.trim() || "（无正文）"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
