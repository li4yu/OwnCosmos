import { ModuleHubCards } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";

export default async function FutureHubPage() {
  await requireSession();
  return (
    <main>
      <ModuleHubCards moduleId="future" />
    </main>
  );
}
