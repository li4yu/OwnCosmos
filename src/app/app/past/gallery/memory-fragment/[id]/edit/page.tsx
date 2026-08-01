import { notFound } from "next/navigation";
import { FragmentEditor } from "@/components/archive/fragment-editor";
import { ARCHIVE_TYPE_MEMORY_FRAGMENT } from "@/db/schema";
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
    <main>
      <FragmentEditor
        mode="edit"
        itemId={item.id}
        initialTitle={item.title === "无标题" ? "" : item.title}
        initialBody={item.body}
        initialImageUrl={item.imageUrl}
      />
    </main>
  );
}
