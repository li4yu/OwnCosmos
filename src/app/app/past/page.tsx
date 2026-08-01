import { PastHubCharts } from "@/components/past/past-hub-charts";
import { ModuleHubCards } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";
import { getPastHubSnapshot } from "@/services/review";

export default async function PastHubPage() {
  const session = await requireSession();
  const snapshot = await getPastHubSnapshot(session.user.id);

  return (
    <main className="flex flex-col gap-3">
      <ModuleHubCards moduleId="past" />
      <PastHubCharts snapshot={snapshot} />
    </main>
  );
}
