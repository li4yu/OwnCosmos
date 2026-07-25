import Link from "next/link";
import { Suspense } from "react";
import { AuthEntry } from "@/components/auth/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  return (
    <div className="atmosphere-wash relative min-h-screen">
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <header className="mb-16 flex items-center justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.2em] text-[var(--amber)]">
              MY OWN COSMOS
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[0.2em] text-[var(--paper)]">
              自宇
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <Link
                href="/app"
                className="rounded border border-[var(--line)] px-3 py-1.5 font-mono text-xs tracking-widest text-[var(--paper)] hover:border-[var(--amber)] hover:text-[var(--amber)]"
              >
                进入
              </Link>
            ) : (
              <Suspense
                fallback={
                  <span className="font-mono text-xs text-[var(--mist)]">…</span>
                }
              >
                <AuthEntry />
              </Suspense>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-8">
          <section>
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--teal)]">
              TEMPORAL PERSONAL UNIVERSE
            </p>
            <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--mist)]">
              时序式个人思绪、规划与专注系统。点右上角登录或注册，小窗即可进入。
            </p>
          </section>

          {session ? (
            <p className="text-sm text-[var(--mist)]">
              已登录为 <span className="text-[var(--paper)]">{session.user.name}</span>
              。前往受保护页继续。
            </p>
          ) : (
            <p className="text-sm text-[var(--mist)]">
              未登录可浏览介绍；个人数据需登录后访问。
            </p>
          )}
        </main>

        <footer className="mt-16 font-mono text-[10px] tracking-[0.16em] text-[var(--mist)]/70">
          OWN COSMOS · WEB · PHASE 1 AUTH
        </footer>
      </div>
    </div>
  );
}
