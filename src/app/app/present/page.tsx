import { ModuleHubCards } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function PresentHubPage() {
  await requireSession();
  return (
    <main>
      <ModuleHubCards moduleId="present" />
    </main>
  );
}
