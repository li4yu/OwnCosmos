import { AppearanceForm } from "@/components/settings/appearance-form";
import { ArchivePreferenceForm } from "@/components/settings/archive-preference-form";
import { ExportOpenContent } from "@/components/settings/export-open-content";
import { NotifyPreferenceForm } from "@/components/settings/notify-preference-form";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    theme?: string;
    essayIdleHours?: number;
    anniversaryRemind?: boolean;
    notifyEnabled?: boolean;
    notifyDueReminder?: boolean;
  };

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="设置"
        eyebrow="SETTINGS"
        description="外观、归档节奏、通知偏好与数据导出"
        backHref="/app"
        backLabel="返回首页"
      />

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          外观
        </p>
        <div className="mt-1.5">
          <AppearanceForm initialTheme={user.theme} />
        </div>
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          流思笺 · 归档
        </p>
        <p className="mt-0.5 text-xs text-[var(--mist)]">
          <PoeticName
            name="逾时沉淀"
            tip="久未改动的随笔会沉淀进昔时往；也可提前归档；小时数可在此修改"
          />
          的自动小时数
        </p>
        <div className="mt-1.5">
          <ArchivePreferenceForm initialIdleHours={user.essayIdleHours} />
        </div>
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          通知与回望
        </p>
        <div className="mt-1.5">
          <NotifyPreferenceForm
            initialNotifyEnabled={user.notifyEnabled ?? true}
            initialNotifyDueReminder={user.notifyDueReminder ?? true}
            initialAnniversaryRemind={Boolean(user.anniversaryRemind)}
          />
        </div>
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          数据导出
        </p>
        <div className="mt-1.5">
          <ExportOpenContent />
        </div>
      </section>
    </main>
  );
}
