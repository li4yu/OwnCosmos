import { SubfeaturePlaceholder } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function PastCorridorPage() {
  await requireSession();
  return (
    <main>
      <SubfeaturePlaceholder moduleId="past" subfeatureId="corridor" />
    </main>
  );
}
