import Link from "next/link";
import { CycleListPanel } from "@/components/plans/cycle-list-panel";
import { PlanListItem } from "@/components/plans/plan-list-item";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { ARCHIVE_TYPE_PLAN_CYCLE } from "@/db/schema";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { formatDueDateInput } from "@/lib/plan-dates";
import { galleryDetailHref } from "@/lib/gallery-sections";
import { PLAN_KIND_CYCLE, cycleUnitLabel } from "@/lib/plan-kinds";
import { parsePlanListSearch } from "@/lib/plan-query";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";
import {
  listCyclePlanTasksForHome,
  localTaskCheckinDate,
  taskCheckedInOnDate,
} from "@/services/plan-tasks";
import {
  canCompleteCyclePeriod,
  queryOpenPlanningPlans,
  seriesHasArchivedPeriodOnDate,
} from "@/services/plans";

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

type Props = {
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    page?: string;
    size?: string;
  }>;
};

export default async function FutureCyclesPage({ searchParams }: Props) {
  const session = await requireSession();
  await runPlanOverdueCatchUp(session.user.id);
  const sp = await searchParams;
  const parsed = parsePlanListSearch(sp);

  const [open, cycleTasks, seriesArchives] = await Promise.all([
    queryOpenPlanningPlans(session.user.id, {
      titleQ: parsed.titleQ,
      kinds: [PLAN_KIND_CYCLE],
      dueFrom: parsed.dueFrom,
      dueTo: parsed.dueTo,
      page: parsed.page,
      pageSize: parsed.pageSize,
    }),
    listCyclePlanTasksForHome(session.user.id),
    listArchiveItems(session.user.id, {
      type: ARCHIVE_TYPE_PLAN_CYCLE,
    }),
  ]);

  const todayKey = localTaskCheckinDate();
  const tasksByPlan = new Map<string, typeof cycleTasks>();
  for (const t of cycleTasks) {
    const list = tasksByPlan.get(t.planId) ?? [];
    list.push(t);
    tasksByPlan.set(t.planId, list);
  }

  const hasFilters = Boolean(
    parsed.titleQ || parsed.fromInput || parsed.toInput,
  );

  const openRows = await Promise.all(
    open.items.map(async (item) => {
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
          dueLabel={item.dueAt ? formatDueDateInput(item.dueAt) : null}
          duePrefix="本期结束"
          kindLabel={cycleUnitLabel(item.cycleUnit, item.cycleEveryDays)}
          canCompletePeriod={canComplete}
          periodDoneToday={doneToday}
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            checkCount: t.checkCount,
            checkedInToday: taskCheckedInOnDate(t.lastCheckinDate, todayKey),
          }))}
        />
      );
    }),
  );

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="轮期"
        backHref="/app/future"
        backLabel="返回来日途"
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

      <CycleListPanel
        total={open.total}
        page={open.page}
        totalPages={open.totalPages}
        pageSize={open.pageSize}
        filters={{
          q: parsed.titleQ ?? "",
          from: parsed.fromInput,
          to: parsed.toInput,
        }}
        emptyHint={
          hasFilters
            ? "没有符合条件的轮期，试试放宽筛选。"
            : "暂无轮期。新建后，本期结束会自动计次并滚入下一期。"
        }
      >
        <ul className="oc-scroll">{openRows}</ul>
      </CycleListPanel>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="oc-section-label mb-0">
            系列计次
            <span className="ml-2 font-mono text-[10px] text-[var(--mist)] font-normal tracking-normal normal-case">
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
          <div className="oc-empty">
            滚期或手动完成后，会在此按系列累计次数（馆藏只保留一条）。
          </div>
        ) : (
          <ul className="oc-scroll">
            {seriesArchives.map((item) => (
              <li key={item.id}>
                <div className="flex items-start gap-3">
                  <Link
                    href={galleryDetailHref(item.id, "plan-cycle")}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="oc-scroll__title text-[1rem] opacity-90">
                        {item.title}
                      </h3>
                      <div className="oc-scroll__meta">
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
                    <p className="oc-scroll__body line-clamp-2">
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
