import { GallerySectionView } from "@/components/archive/gallery-section-view";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { requireSession } from "@/lib/session";

type Props = {
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    page?: string;
    size?: string;
  }>;
};

export default async function GalleryEssaySedimentPage({ searchParams }: Props) {
  const session = await requireSession();
  await runEssayArchiveCatchUp(session.user.id);
  return (
    <GallerySectionView
      userId={session.user.id}
      sectionId="essay-sediment"
      searchParams={await searchParams}
    />
  );
}
