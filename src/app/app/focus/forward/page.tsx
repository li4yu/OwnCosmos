import { SubfeaturePlaceholder } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function FocusForwardPage() {
  await requireSession();
  return (
    <main>
      <SubfeaturePlaceholder moduleId="focus" subfeatureId="forward" />
    </main>
  );
}
