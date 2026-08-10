import Link from "next/link";
import { DueReminderSection } from "@/components/due/due-reminder-section";
import { HomeCheckinBoard } from "@/components/home/home-checkin-board";
import { HomePulseStrip } from "@/components/home/home-pulse-strip";
import { PoeticName } from "@/components/ui/poetic-name";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { QUICK_JUMP_MODULES } from "@/lib/modules";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { requireSession } from "@/lib/session";
import {
  getRecentCheckinDayCounts,
  getRecentFocusDayStats,
} from "@/services/home-pulse";
import { getHomeSummary } from "@/services/home-summary";

function formatTodayLabel(d = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

export default async function AppHomePage() {
  const session = await requireSession();
  await Promise.all([
    runEssayArchiveCatchUp(session.user.id),
    runPlanOverdueCatchUp(session.user.id),
  ]);
  const [summary, checkinDays, focusDays] = await Promise.all([
    getHomeSummary(session.user.id),
    getRecentCheckinDayCounts(session.user.id, 7),
    getRecentFocusDayStats(session.user.id, 7),
  ]);
  const user = session.user as typeof session.user & {
    bio?: string | null;
  };

  return (
    <main className="home-v1">
      <section className="home-v1__hero">
        <div className="home-v1__hero-top">
          <h1 className="home-v1__brand">
            自宇
            <em>My Own Cosmos</em>
          </h1>
          <p className="home-v1__date">{formatTodayLabel()}</p>
        </div>
        <p className="home-v1__lede">
          你好，{user.name}
          <span className="home-v1__lede-tail">
            · 留存过往，安住当下，奔赴未来
          </span>
        </p>
        <p className="home-v1__help">
          今日先看摘要与临期，再按需进入时序。
          <Link href="/app/guide" className="home-v1__help-link">
            使用说明 →
          </Link>
        </p>
        <div className="home-v1__actions home-v1__actions--hero" aria-label="快捷动作">
          <Link href="/app/present/essays/new" className="home-v1__action">
            写随笔
          </Link>
          <Link href="/app/future/plans/new" className="home-v1__action">
            新建计划
          </Link>
          <Link href="/app/future/daily" className="home-v1__action">
            每日打卡
          </Link>
          <Link
            href="/app/focus/forward"
            className="home-v1__action home-v1__action--primary"
          >
            正向计时
          </Link>
        </div>
      </section>

      <section className="home-v1__summary" aria-label="今日摘要">
        <div className="home-v1__summary-head">
          <h2>今日摘要</h2>
          <p>临期 · 随笔 · 专注 · 每日打卡</p>
        </div>
        <ul className="home-v1__metrics">
          <li>
            <Link href="/app/present/due" className="home-v1__metric">
              <span className="home-v1__metric-label">临期</span>
              <span className="home-v1__metric-value">{summary.dueCount}</span>
            </Link>
          </li>
          <li>
            <Link href="/app/present/essays" className="home-v1__metric">
              <span className="home-v1__metric-label">流动随笔</span>
              <span className="home-v1__metric-value">
                {summary.activeEssayCount}
              </span>
            </Link>
          </li>
          <li>
            <Link href="/app/focus/forward" className="home-v1__metric">
              <span className="home-v1__metric-label">今日专注</span>
              <span className="home-v1__metric-value home-v1__metric-value--text">
                {summary.todayFocusLabel}
              </span>
            </Link>
          </li>
          <li>
            <Link href="/app/future/daily" className="home-v1__metric">
              <span className="home-v1__metric-label">每日打卡</span>
              <span className="home-v1__metric-value home-v1__metric-value--text">
                {summary.dailyTotal > 0
                  ? `${summary.dailyDone}/${summary.dailyTotal}`
                  : "—"}
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <div className="home-v1__split">
        <section className="home-v1__due" aria-label="临期提醒">
          <DueReminderSection
            items={summary.dueItems}
            compact
            emptyHint="暂无临期。设置截止日期与提前提醒后会出现在这里。"
          />
        </section>

        <HomeCheckinBoard
          items={summary.checkinItems}
          dailyDone={summary.dailyDone}
          dailyTotal={summary.dailyTotal}
        />
      </div>

      <HomePulseStrip checkinDays={checkinDays} focusDays={focusDays} />

      <section className="home-v1__jumps" aria-label="时序入口">
        <div className="home-v1__summary-head">
          <h2>时序入口</h2>
          <p>过去 → 现在 → 将来 → 专注</p>
        </div>
        <div className="home-v1__orbit-list">
          {QUICK_JUMP_MODULES.map((mod, i) => (
            <Link
              key={mod.id}
              href={mod.href}
              className="home-v1__jump"
              data-index={String(i + 1).padStart(2, "0")}
            >
              <span className="home-v1__jump-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="home-v1__jump-body">
                <span className="home-v1__jump-eyebrow">{mod.eyebrow}</span>
                <span className="home-v1__jump-name">
                  <PoeticName name={mod.name} tip={mod.tip} />
                </span>
              </span>
              <span className="home-v1__jump-go" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
