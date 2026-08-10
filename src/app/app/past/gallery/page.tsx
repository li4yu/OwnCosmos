import { GalleryListView } from "@/components/archive/gallery-list-view";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { requireSession } from "@/lib/session";

type Props = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    kept?: string;
    from?: string;
    to?: string;
    tag?: string;
    page?: string;
    size?: string;
  }>;
};

export default async function GalleryPage({ searchParams }: Props) {
  const session = await requireSession();
  await runEssayArchiveCatchUp(session.user.id);
  const sp = await searchParams;
  return <GalleryListView userId={session.user.id} searchParams={sp} />;
}
