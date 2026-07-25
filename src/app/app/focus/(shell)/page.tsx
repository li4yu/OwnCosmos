import { ModuleHubCards } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function FocusHubPage() {
  await requireSession();
  return (
    <main>
      <ModuleHubCards moduleId="focus" />
    </main>
  );
}
