import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { galleryDetailHref } from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";
import { listCompletedFocusSessions } from "@/services/focus";

function formatWhen(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function FocusRecordsPage() {
  const session = await requireSession();
  const records = await listCompletedFocusSessions(session.user.id);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="凝录"
        description={
          <>
            <PoeticName
              name="凝录"
              tip="记下这段专注的收获与心情；结束后会沉淀进昔时往"
            />
            · 完整结束后的记录；详情只读见馆藏
          </>
        }
        actions={
          <Link
            href="/app/focus/forward"
            className="ui-btn-primary !w-auto px-4 py-2 text-xs"
          >
            开顺钟
          </Link>
        }
      />

      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--mist)]">
          尚无凝录。完成一次顺钟后会出现在这里，并同步进入拾忆馆藏。
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {records.map((item) => {
            const href = item.archiveId
              ? galleryDetailHref(item.archiveId, "focus-record")
              : "/app/past/gallery/focus-record";
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className="block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--amber)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base text-[var(--paper)]">
                      {item.title || "凝录"}
                    </h3>
                    <div className="flex shrink-0 flex-col items-end gap-1 font-mono text-[10px] tracking-wide text-[var(--mist)]">
                      <span>{formatFocusDurationMs(item.elapsedMs)}</span>
                      <time>{formatWhen(item.endedAt)}</time>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--mist)]">
                    {item.reflection.trim() || "（无心得）"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
