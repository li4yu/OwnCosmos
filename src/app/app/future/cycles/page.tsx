import Link from "next/link";
import { PlanListItem } from "@/components/plans/plan-list-item";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { formatDueDateInput } from "@/lib/plan-dates";
import { cycleUnitLabel } from "@/lib/plan-kinds";
import { galleryDetailHref } from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";
import { ARCHIVE_TYPE_PLAN_CYCLE } from "@/db/schema";
import {
  listCyclePlanTasksForHome,
  localTaskCheckinDate,
  taskCheckedInOnDate,
} from "@/services/plan-tasks";
import {
  canCompleteCyclePeriod,
  listOpenCyclePlans,
  seriesHasArchivedPeriodOnDate,
} from "@/services/plans";

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export default async function FutureCyclesPage() {
  const session = await requireSession();
  await runPlanOverdueCatchUp(session.user.id);
  const openPlans = await listOpenCyclePlans(session.user.id);
  const cycleTasks = await listCyclePlanTasksForHome(session.user.id);
  const todayKey = localTaskCheckinDate();
  const tasksByPlan = new Map<string, typeof cycleTasks>();
  for (const t of cycleTasks) {
    const list = tasksByPlan.get(t.planId) ?? [];
    list.push(t);
    tasksByPlan.set(t.planId, list);
  }
  const seriesArchives = await listArchiveItems(session.user.id, {
    type: ARCHIVE_TYPE_PLAN_CYCLE,
  });

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="轮期"
        description={
          <>
            <PoeticName
              name="轮期"
              tip="按日/周/月/年/自定义天数滚动；子任务打卡只记次数，与完成本期无关"
            />
            · 馆藏按系列计次，不每期占一条
          </>
        }
        actions={
          <Link
            href="/app/future/plans/new?kind=cycle"
            className="ui-btn-primary ui-btn-sm shrink-0"
          >
            新建轮期
          </Link>
        }
      />

      <section className="flex flex-col gap-1.5">
        <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
          进行中
          <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
            {openPlans.length}
          </span>
        </h2>
        {openPlans.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--mist)]">
            暂无轮期。新建后，本期结束会自动计次并滚入下一期。
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {await Promise.all(
              openPlans.map(async (item) => {
                const tasks = tasksByPlan.get(item.id) ?? [];
                const seriesId = item.seriesId ?? item.id;
                const canComplete = canCompleteCyclePeriod(item.dueAt);
                const doneToday = await seriesHasArchivedPeriodOnDate(
                  session.user.id,
                  seriesId,
                  todayKey,
                );
                return (
                  <PlanListItem
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    body={item.body}
                    dueLabel={
                      item.dueAt ? formatDueDateInput(item.dueAt) : null
                    }
                    duePrefix="本期结束"
                    kindLabel={cycleUnitLabel(
                      item.cycleUnit,
                      item.cycleEveryDays,
                    )}
                    canCompletePeriod={canComplete}
                    periodDoneToday={doneToday}
                    tasks={tasks.map((t) => ({
                      id: t.id,
                      title: t.title,
                      checkCount: t.checkCount,
                      checkedInToday: taskCheckedInOnDate(
                        t.lastCheckinDate,
                        todayKey,
                      ),
                    }))}
                  />
                );
              }),
            )}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
            系列计次
            <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
              {seriesArchives.length}
            </span>
          </h2>
          <Link
            href="/app/past/gallery/plan-cycle"
            className="font-mono text-[10px] tracking-wide text-[var(--amber)] hover:underline"
          >
            馆藏·轮期归档 →
          </Link>
        </div>
        {seriesArchives.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--mist)]">
            滚期或手动完成后，会在此按系列累计次数（馆藏只保留一条）。
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {seriesArchives.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-[var(--line)] bg-[var(--panel)]/70 px-2.5 py-2"
              >
                <div className="flex items-start gap-3">
                  <Link
                    href={galleryDetailHref(item.id, "plan-cycle")}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-base text-[var(--paper)] opacity-90">
                        {item.title}
                      </h3>
                      <div className="flex shrink-0 flex-col items-end gap-1 font-mono text-[10px] tracking-wide text-[var(--mist)]">
                        <span className="text-[var(--teal)]">
                          已完成 {item.cycleCount ?? 0} 次
                        </span>
                        {item.cycleUnit ? (
                          <span>
                            {cycleUnitLabel(
                              item.cycleUnit,
                              item.cycleEveryDays,
                            )}
                          </span>
                        ) : null}
                        <time>最近 {formatWhen(item.archivedAt)}</time>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--mist)]">
                      {item.body.trim() || "（无描述）"}
                    </p>
                  </Link>
                  <Link
                    href={galleryDetailHref(item.id, "plan-cycle")}
                    className="ui-btn-ghost ui-btn-sm shrink-0 text-[var(--teal)]"
                  >
                    看馆藏
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
