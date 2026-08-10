import Link from "next/link";
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

export default async function GalleryMemoryFragmentPage({
  searchParams,
}: Props) {
  const session = await requireSession();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link
          href="/app/past/gallery/memory-fragment/new"
          className="ui-btn-ghost ui-btn-sm"
        >
          上传碎片
        </Link>
      </div>
      <GallerySectionView
        userId={session.user.id}
        sectionId="memory-fragment"
        searchParams={await searchParams}
      />
    </div>
  );
}
