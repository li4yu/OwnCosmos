import { GallerySectionView } from "@/components/archive/gallery-section-view";
import { requireSession } from "@/lib/session";

type Props = {
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

export default async function GalleryPlanArchivePage({ searchParams }: Props) {
  const session = await requireSession();
  return (
    <GallerySectionView
      userId={session.user.id}
      sectionId="plan-archive"
      searchParams={await searchParams}
    />
  );
}
