import { AppearanceForm } from "@/components/settings/appearance-form";
import { AppHeader } from "@/components/shell/app-header";
import { requireSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    theme?: string;
  };

  return (
    <div className="atmosphere-wash min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <AppHeader
          title="设置"
          eyebrow="SETTINGS"
          backHref="/app"
          backLabel="返回"
          user={{ name: user.name, email: user.email, image: user.image }}
        />

        <main className="flex flex-1 flex-col gap-8">
          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
            <h2 className="mb-4 text-lg tracking-[0.12em] text-[var(--paper)]">外观</h2>
            <AppearanceForm initialTheme={user.theme} />
          </section>

          <section className="rounded-xl border border-dashed border-[var(--line)] p-5">
            <h2 className="text-lg tracking-[0.12em] text-[var(--mist)]">其他设置</h2>
            <p className="mt-2 text-sm text-[var(--mist)]/80">通知、数据导出等后续完善。</p>
          </section>
        </main>
      </div>
    </div>
  );
}
