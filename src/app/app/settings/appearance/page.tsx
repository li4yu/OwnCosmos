import { AppearanceForm } from "@/components/settings/appearance-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";

export default async function AppearanceSettingsPage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & { theme?: string };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title="外观"
        eyebrow="APPEARANCE"
        description="主题色板；登录后写入账号，各端同步"
        backHref="/app/settings"
        backLabel="返回设置"
      />
      <SettingsSection
        label="主题"
        description="深空夜色 / 时光卡其 / 墨白 / 素曜（白色高级）"
      >
        <AppearanceForm initialTheme={user.theme} />
      </SettingsSection>
    </main>
  );
}
