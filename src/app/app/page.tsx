import { AppHeader } from "@/components/shell/app-header";
import { displayInitial } from "@/lib/user-display";
import { requireSession } from "@/lib/session";

export default async function AppHomePage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    theme?: string;
    bio?: string | null;
  };

  return (
    <div className="atmosphere-wash min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <AppHeader
          title="自宇"
          user={{ name: user.name, email: user.email, image: user.image }}
        />

        <main className="flex flex-1 flex-col gap-8">
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
                <p className="font-mono text-xs tracking-[0.18em] text-[var(--teal)]">SESSION</p>
                <p className="mt-2 text-lg text-[var(--paper)]">你好，{user.name}</p>
                <p className="mt-1 text-sm text-[var(--mist)]">{user.email}</p>
                {user.bio ? (
                  <p className="mt-3 text-sm leading-6 text-[var(--mist)]">{user.bio}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded border border-dashed border-[var(--line)] p-4 font-mono text-xs leading-6 tracking-wide text-[var(--mist)]">
            <p>验收（Phase 2）</p>
            <ul className="mt-2 list-inside list-disc">
              <li>右上角头像下拉：编辑资料 / 设置 / 其他功能（占位）</li>
              <li>编辑资料可改昵称、上传头像、简介；无头像时显示首字母</li>
              <li>设置里切换主题并入库；刷新后主题保持</li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
