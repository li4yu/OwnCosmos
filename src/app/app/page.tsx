import Link from "next/link";
import { PoeticName } from "@/components/ui/poetic-name";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { QUICK_JUMP_MODULES } from "@/lib/modules";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { requireSession } from "@/lib/session";
import { getHomeSummary } from "@/services/home-summary";

function formatTodayLabel(d = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(d);
}

export default async function AppHomePage() {
  const session = await requireSession();
  await Promise.all([
    runEssayArchiveCatchUp(session.user.id),
    runPlanOverdueCatchUp(session.user.id),
  ]);
  const summary = await getHomeSummary(session.user.id);
  const user = session.user as typeof session.user & {
    bio?: string | null;
  };

  return (
    <main className="home-v1 flex flex-col gap-10">
      <section className="home-v1__hero">
        <p className="home-v1__eyebrow">TEMPORAL PERSONAL UNIVERSE</p>
        <h1 className="home-v1__brand">
          自宇
          <em>My Own Cosmos</em>
        </h1>
        <p className="home-v1__lede">
          你好，{user.name}。留存过往，安住当下，奔赴未来——并以专注，把光阴凝成可回望的轨迹。
        </p>
        <p className="home-v1__date">{formatTodayLabel()}</p>
      </section>

      <section className="home-v1__summary" aria-label="今日摘要">
        <div className="home-v1__summary-head">
          <h2>今日摘要</h2>
          <p>只读聚合 · 不改写各模块本体</p>
        </div>
        <ul className="home-v1__metrics">
          <li>
            <Link href="/app/present/due" className="home-v1__metric">
              <span className="home-v1__metric-label">临期</span>
              <span className="home-v1__metric-value">{summary.dueCount}</span>
              <span className="home-v1__metric-hint">进入提醒窗的计划</span>
            </Link>
          </li>
          <li>
            <Link href="/app/present/essays" className="home-v1__metric">
              <span className="home-v1__metric-label">流动随笔</span>
              <span className="home-v1__metric-value">
                {summary.activeEssayCount}
              </span>
              <span className="home-v1__metric-hint">尚未沉淀入馆藏</span>
            </Link>
          </li>
          <li>
            <Link href="/app/focus/forward" className="home-v1__metric">
              <span className="home-v1__metric-label">今日专注</span>
              <span className="home-v1__metric-value home-v1__metric-value--text">
                {summary.todayFocusLabel}
              </span>
              <span className="home-v1__metric-hint">含进行中累计</span>
            </Link>
          </li>
        </ul>
      </section>

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
                <span className="home-v1__jump-tip">{mod.tip}</span>
              </span>
              <span className="home-v1__jump-go" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-v1__actions" aria-label="快捷动作">
        <Link href="/app/present/essays/new" className="home-v1__action">
          写随笔
        </Link>
        <Link href="/app/future/plans/new" className="home-v1__action">
          新建计划
        </Link>
        <Link href="/app/focus/forward" className="home-v1__action home-v1__action--primary">
          开顺钟
        </Link>
      </section>
    </main>
  );
}
