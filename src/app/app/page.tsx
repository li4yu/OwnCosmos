import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { QUICK_JUMP_MODULES } from "@/lib/modules";
import { displayInitial } from "@/lib/user-display";
import { requireSession } from "@/lib/session";

export default async function AppHomePage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    bio?: string | null;
  };

  return (
    <main className="flex flex-col gap-8">
      <PageHeader
        title="首页"
        eyebrow="HOME"
        description="欢迎回来。快捷入口按时序排列：过去 → 现在 → 将来，再接专注。"
      />

      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex items-start gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="h-14 w-14 rounded-full border border-[var(--line)] object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--field-bg)] font-mono text-lg text-[var(--paper)]">
              {displayInitial(user.name)}
            </div>
          )}
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--teal)]">
              SESSION
            </p>
            <p className="mt-2 text-lg text-[var(--paper)]">你好，{user.name}</p>
            <p className="mt-1 text-sm text-[var(--mist)]">{user.email}</p>
            {user.bio ? (
              <p className="mt-3 text-sm leading-6 text-[var(--mist)]">{user.bio}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm tracking-[0.12em] text-[var(--mist)]">快捷进入</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_JUMP_MODULES.map((mod) =>
            mod.ready ? (
              <Link
                key={mod.id}
                href={mod.href}
                className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--amber)]"
              >
                <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--teal)]">
                  {mod.eyebrow}
                </p>
                <h3 className="mt-2 text-xl tracking-[0.14em] text-[var(--paper)]">
                  <PoeticName name={mod.name} tip={mod.tip} />
                </h3>
                <p className="mt-2 text-sm text-[var(--mist)]">{mod.tip}</p>
              </Link>
            ) : (
              <div
                key={mod.id}
                className="rounded-xl border border-dashed border-[var(--line)] p-4 opacity-70"
              >
                <p className="font-mono text-[10px] tracking-[0.18em] text-[var(--mist)]">
                  {mod.eyebrow}
                </p>
                <h3 className="mt-2 text-xl tracking-[0.14em] text-[var(--mist)]">
                  <PoeticName name={mod.name} tip={mod.tip} />
                </h3>
                <p className="mt-2 text-sm text-[var(--mist)]">后续 Phase 开放</p>
              </div>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
