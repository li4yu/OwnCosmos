import Link from "next/link";
import { FocusRecordsPanel } from "@/components/focus/focus-records-panel";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";
import { listCompletedFocusSessions } from "@/services/focus";

export default async function FocusRecordsPage() {
  const session = await requireSession();
  const records = await listCompletedFocusSessions(session.user.id);

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="专注记录"
        backHref="/app/focus"
        backLabel="返回凝时"
        description={
          <>
            <PoeticName
              name="专注记录"
              tip="记下这段专注的收获与心情；结束后会沉淀进昔时往"
            />
            · 完整结束后的记录；详情只读见馆藏
          </>
        }
        actions={
          <Link
            href="/app/focus/forward"
            className="ui-btn-primary ui-btn-sm shrink-0"
          >
            正向计时
          </Link>
        }
      />

      <FocusRecordsPanel
        items={records.map((item) => ({
          id: item.id,
          title: item.title,
          reflection: item.reflection,
          elapsedMs: item.elapsedMs,
          endedAt: item.endedAt,
          archiveId: item.archiveId,
        }))}
      />
    </main>
  );
}
