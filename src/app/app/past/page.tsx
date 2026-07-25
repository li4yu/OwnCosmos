import { ModuleHubCards } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function PastHubPage() {
  await requireSession();
  return (
    <main>
      <ModuleHubCards moduleId="past" />
    </main>
  );
}
