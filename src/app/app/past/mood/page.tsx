import { SubfeaturePlaceholder } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function PastMoodPage() {
  await requireSession();
  return (
    <main>
      <SubfeaturePlaceholder moduleId="past" subfeatureId="mood" />
    </main>
  );
}
