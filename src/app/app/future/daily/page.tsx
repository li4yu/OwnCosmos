import { DailyHabits } from "@/components/daily/daily-habits";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";
import {
  listActiveHabits,
  listTodayCheckins,
  localCheckinDate,
} from "@/services/daily";

export default async function FutureDailyPage() {
  const session = await requireSession();
  const habits = await listActiveHabits(session.user.id);
  const checkins = await listTodayCheckins(session.user.id);
  const byHabit = new Map(checkins.map((c) => [c.habitId, c]));
  const todayLabel = localCheckinDate();

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="日课"
        description={
          <>
            <PoeticName name="日课" tip="每日习惯打卡，可附一句心得" />
            · 与规划表分离，专注日常自律
          </>
        }
      />
      <DailyHabits
        todayLabel={todayLabel}
        habits={habits.map((h) => {
          const c = byHabit.get(h.id);
          return {
            id: h.id,
            title: h.title,
            body: h.body,
            checkedIn: Boolean(c),
            note: c?.note ?? "",
          };
        })}
      />
    </main>
  );
}
