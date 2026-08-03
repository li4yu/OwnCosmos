import { GallerySectionView } from "@/components/archive/gallery-section-view";
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

export default async function GalleryEssayTopicPage({ searchParams }: Props) {
  const session = await requireSession();
  return (
    <GallerySectionView
      userId={session.user.id}
      sectionId="essay-topic"
      searchParams={await searchParams}
    />
  );
}
