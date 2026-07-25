import { ArchiveDetailView } from "@/components/archive/archive-detail-view";
import {
  getGallerySection,
  type GallerySectionId,
} from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
};

export default async function GalleryDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { section: sectionParam } = await searchParams;
  const session = await requireSession();
  const section = getGallerySection(sectionParam);
  const sectionId = (section?.id ?? "all") as GallerySectionId;
  const backHref = section?.href ?? "/app/past/gallery";
  const backLabel =
    sectionId === "all" ? "返回馆藏" : `返回${section?.name ?? "馆藏"}`;

  return (
    <ArchiveDetailView
      userId={session.user.id}
      itemId={id}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
