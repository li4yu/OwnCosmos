import { FocusTimer } from "@/components/focus/focus-timer";
import { FOCUS_MODE_FORWARD } from "@/db/schema";
import { loadFocusTimerActive } from "@/lib/focus-page";
import { requireSession } from "@/lib/session";
import { listFocusBindOptions } from "@/services/focus";

export default async function FocusForwardPage() {
  const session = await requireSession();
  const [active, bindOptions] = await Promise.all([
    loadFocusTimerActive(session.user.id),
    listFocusBindOptions(session.user.id),
  ]);

  return (
    <FocusTimer
      pageMode={FOCUS_MODE_FORWARD}
      active={active}
      bindOptions={bindOptions}
    />
  );
}
