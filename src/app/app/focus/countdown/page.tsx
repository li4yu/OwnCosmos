import { FocusTimer } from "@/components/focus/focus-timer";
import {
  DEFAULT_FOCUS_COUNTDOWN_MS,
  FOCUS_MODE_COUNTDOWN,
} from "@/db/schema";
import { loadFocusTimerActive } from "@/lib/focus-page";
import { requireSession } from "@/lib/session";
import { listFocusBindOptions } from "@/services/focus";

export default async function FocusCountdownPage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    focusDnd?: boolean;
    focusCountdownDefaultMs?: number;
  };
  const [active, bindOptions] = await Promise.all([
    loadFocusTimerActive(session.user.id),
    listFocusBindOptions(session.user.id),
  ]);

  return (
    <FocusTimer
      pageMode={FOCUS_MODE_COUNTDOWN}
      active={active}
      bindOptions={bindOptions}
      focusDnd={Boolean(user.focusDnd)}
      countdownDefaultMs={
        user.focusCountdownDefaultMs ?? DEFAULT_FOCUS_COUNTDOWN_MS
      }
    />
  );
}