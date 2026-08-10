import { ExportChartsPanel } from "@/components/settings/export-charts-panel";
import { ExportOpenContent } from "@/components/settings/export-open-content";
import { SettingsSection } from "@/components/settings/settings-section";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";

export default async function ExportSettingsPage() {
  await requireSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title="导出"
        eyebrow="EXPORT"
        description="开放内容与图表导出"
        backHref="/app/settings"
        backLabel="返回设置"
      />
      <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
        <SettingsSection label="数据导出">
          <ExportOpenContent />
        </SettingsSection>
        <SettingsSection label="图表导出">
          <ExportChartsPanel />
        </SettingsSection>
      </div>
    </main>
  );
}
