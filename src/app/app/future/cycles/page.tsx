import { SubfeaturePlaceholder } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function FutureCyclesPage() {
  await requireSession();
  return (
    <main>
      <SubfeaturePlaceholder moduleId="future" subfeatureId="cycles" />
    </main>
  );
}
