import { ArchiveDetailView } from "@/components/archive/archive-detail-view";
import { requireSession } from "@/lib/session";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GalleryDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();

  return (
    <ArchiveDetailView
      userId={session.user.id}
      itemId={id}
      backHref="/app/past/gallery"
      backLabel="返回馆藏"
    />
  );
}
