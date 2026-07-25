import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireSession } from "@/lib/session";

export default async function AppHomePage() {
  const session = await requireSession();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
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
          <span className="rounded bg-[var(--amber)] px-2 py-1 font-mono text-[10px] tracking-widest text-[var(--void)]">
            PHASE 1
          </span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8">
        <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--teal)]">SESSION</p>
          <p className="mt-3 text-lg text-[var(--paper)]">
            你好，{session.user.name}
          </p>
          <p className="mt-1 text-sm text-[var(--mist)]">{session.user.email}</p>
        </section>

        <section className="rounded border border-dashed border-[var(--line)] p-4 font-mono text-xs leading-6 tracking-wide text-[var(--mist)]">
          <p>验收（Phase 1）</p>
          <ul className="mt-2 list-inside list-disc">
            <li>可注册、登录、退出后再登录</li>
            <li>未登录访问 /app 会跳到登录页</li>
            <li>本页为受保护业务壳；四大模块在后续 Phase</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
