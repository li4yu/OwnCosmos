import { CapsuleUnlockOrb } from "@/components/capsule/capsule-unlock-orb";
import { AppChrome } from "@/components/shell/app-chrome";
import { formatDueDateInput } from "@/lib/plan-dates";
import { requireSession } from "@/lib/session";
import { listUnlockReadyCapsules } from "@/services/plans";

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const readyCapsules = await listUnlockReadyCapsules(session.user.id);

  return (
    <div className="atmosphere-wash min-h-screen">
      <AppChrome
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
      <div className="app-shell-width mx-auto py-5 sm:py-6">{children}</div>
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
