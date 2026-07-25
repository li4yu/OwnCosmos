import { ForwardTimer } from "@/components/focus/forward-timer";
import { requireSession } from "@/lib/session";
import { getActiveFocusSession } from "@/services/focus";

export default async function FocusForwardPage() {
  const session = await requireSession();
  const active = await getActiveFocusSession(session.user.id);

  return (
    <ForwardTimer
      active={
        active
          ? {
              id: active.id,
              status: active.status,
              accumulatedMs: active.accumulatedMs,
              runningSince: active.runningSince
                ? active.runningSince.toISOString()
                : null,
            }
          : null
      }
    />
  );
}
