import { SubfeaturePlaceholder } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function FocusCountdownPage() {
  await requireSession();
  return (
    <main>
      <SubfeaturePlaceholder moduleId="focus" subfeatureId="countdown" />
    </main>
  );
}
