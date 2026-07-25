import { SubfeaturePlaceholder } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function PastGalleryPage() {
  await requireSession();
  return (
    <main>
      <SubfeaturePlaceholder moduleId="past" subfeatureId="gallery" />
    </main>
  );
}
