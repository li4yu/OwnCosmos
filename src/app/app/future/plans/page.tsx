import { SubfeaturePlaceholder } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function FuturePlansPage() {
  await requireSession();
  return (
    <main>
      <SubfeaturePlaceholder moduleId="future" subfeatureId="plans" />
    </main>
  );
}
