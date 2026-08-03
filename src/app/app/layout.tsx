import { CapsuleUnlockOrb } from "@/components/capsule/capsule-unlock-orb";
import { DesktopNotifyBridge } from "@/components/notify/desktop-notify-bridge";
import { AppChrome } from "@/components/shell/app-chrome";
import { formatDueDateInput } from "@/lib/plan-dates";
import { requireSession } from "@/lib/session";
import {
  listDueReminderPlans,
  listUnlockReadyCapsules,
} from "@/services/plans";
import { listAnniversaryHits } from "@/services/review";

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    notifyEnabled?: boolean;
    notifyDueReminder?: boolean;
    anniversaryRemind?: boolean;
    focusDnd?: boolean;
  };

  const notifyEnabled = user.notifyEnabled ?? true;
  const notifyDueReminder = user.notifyDueReminder ?? true;
  const anniversaryRemind = Boolean(user.anniversaryRemind);
  const focusDnd = Boolean(user.focusDnd);

  const [readyCapsules, dueRows, anniversaryHits] = await Promise.all([
    listUnlockReadyCapsules(session.user.id),
    notifyEnabled && notifyDueReminder
      ? listDueReminderPlans(session.user.id)
      : Promise.resolve([]),
    notifyEnabled && anniversaryRemind
      ? listAnniversaryHits(session.user.id)
      : Promise.resolve([]),
  ]);

  return (
    <div className="atmosphere-wash min-h-screen">
      <AppChrome
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
      <div className="app-shell-width mx-auto py-2.5 sm:py-3">{children}</div>
      <DesktopNotifyBridge
        notifyEnabled={notifyEnabled}
        notifyDueReminder={notifyDueReminder}
        anniversaryRemind={anniversaryRemind}
        focusDnd={focusDnd}
        dueItems={dueRows.map((row) => ({
          id: row.id,
          title: row.title,
          daysLeft: row.daysLeft,
        }))}
        anniversaryHits={anniversaryHits.map((h) => ({
          id: h.id,
          title: h.title,
          year: h.year,
        }))}
      />
      {readyCapsules.length > 0 ? (
        <CapsuleUnlockOrb
          userId={session.user.id}
          items={readyCapsules.map((row) => ({
            id: row.id,
            title: row.title,
            body: row.body,
            dueLabel: row.dueAt ? formatDueDateInput(row.dueAt) : "—",
          }))}
        />
      ) : null}
    </div>
  );
}
