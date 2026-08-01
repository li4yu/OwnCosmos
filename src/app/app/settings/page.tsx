import { AppearanceForm } from "@/components/settings/appearance-form";
import { ArchivePreferenceForm } from "@/components/settings/archive-preference-form";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    theme?: string;
    essayIdleHours?: number;
  };

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="设置"
        eyebrow="SETTINGS"
        backHref="/app"
        backLabel="返回首页"
      />

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
        <h2 className="mb-4 text-lg tracking-[0.12em] text-[var(--paper)]">外观</h2>
        <AppearanceForm initialTheme={user.theme} />
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
        <h2 className="mb-4 text-lg tracking-[0.12em] text-[var(--paper)]">
          <PoeticName
            name="流思笺"
            tip="快速记下当下灵感与草稿，未归档前可随时改"
          />
          · 归档
        </h2>
        <ArchivePreferenceForm initialIdleHours={user.essayIdleHours} />
      </section>

      <section className="rounded-md border border-dashed border-[var(--line)] p-3">
        <h2 className="text-lg tracking-[0.12em] text-[var(--mist)]">其他设置</h2>
        <p className="mt-2 text-sm text-[var(--mist)]/80">通知、数据导出等后续完善。</p>
      </section>
    </main>
  );
}
