import { CapsuleUnlockOrb } from "@/components/capsule/capsule-unlock-orb";
import { CompanionShell } from "@/components/companion/companion-shell";
import { DesktopNotifyBridge } from "@/components/notify/desktop-notify-bridge";
import { AppAtmosphere } from "@/components/shell/app-atmosphere";
import { AppChrome } from "@/components/shell/app-chrome";
import { formatDueDateInput } from "@/lib/plan-dates";
import { requireSession } from "@/lib/session";
import {
  listDueReminderPlans,
  listUnlockReadyCapsules,
} from "@/services/plans";
import { listAnniversaryHits } from "@/services/review";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onVerifyPage = pathname.startsWith("/app/verify-email");

  if (!session.user.emailVerified && !onVerifyPage) {
    redirect("/app/verify-email");
  }

  if (!session.user.emailVerified && onVerifyPage) {
    return (
      <AppAtmosphere>
        <div className="app-shell-width mx-auto py-8 sm:py-10">{children}</div>
      </AppAtmosphere>
    );
  }

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
    <AppAtmosphere>
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
      <CompanionShell userName={session.user.name} />
    </AppAtmosphere>
  );
}
