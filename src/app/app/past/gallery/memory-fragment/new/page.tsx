import { FragmentEditor } from "@/components/archive/fragment-editor";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";

export default async function NewMemoryFragmentPage() {
  await requireSession();
  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="上传记忆碎片"
        backHref="/app/past/gallery"
        backLabel="返回馆藏"
        description="上传照片或写下文字回忆，收进馆藏"
      />
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <FragmentEditor mode="create" />
      </section>
    </main>
  );
}
