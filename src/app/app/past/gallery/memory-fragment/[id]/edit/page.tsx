import { notFound } from "next/navigation";
import { FragmentEditor } from "@/components/archive/fragment-editor";
import { PageHeader } from "@/components/shell/page-header";
import { ARCHIVE_TYPE_MEMORY_FRAGMENT } from "@/db/schema";
import { galleryDetailHref } from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";
import { getArchiveItem } from "@/services/archive";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditMemoryFragmentPage({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();
  const item = await getArchiveItem(session.user.id, id);
  if (!item || item.type !== ARCHIVE_TYPE_MEMORY_FRAGMENT) notFound();

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="编辑记忆碎片"
        backHref={galleryDetailHref(item.id, "memory-fragment")}
        backLabel="返回详情"
        description="标题、文字或图片至少填一项；图片永不纳入知识库"
      />
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <FragmentEditor
          mode="edit"
          itemId={item.id}
          initialTitle={item.title === "无标题" ? "" : item.title}
          initialBody={item.body}
          initialImageUrl={item.imageUrl}
        />
      </section>
    </main>
  );
}
