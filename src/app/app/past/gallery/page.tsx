import { GallerySectionView } from "@/components/archive/gallery-section-view";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { requireSession } from "@/lib/session";

type Props = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    kept?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

export default async function GalleryPage({ searchParams }: Props) {
  const session = await requireSession();
  await runEssayArchiveCatchUp(session.user.id);
  const sp = await searchParams;
  return (
    <GallerySectionView
      userId={session.user.id}
      sectionId="all"
      searchParams={sp}
    />
  );
}
