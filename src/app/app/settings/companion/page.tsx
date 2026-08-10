import { CompanionPreferenceForm } from "@/components/settings/companion-preference-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";

export default async function CompanionSettingsPage() {
  await requireSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title="伴读"
        eyebrow="COMPANION"
        description="形象、称呼与语气、主动气泡频控与勿扰；对话总闸仍为环境变量 AI_ENABLED"
        backHref="/app/settings"
        backLabel="返回设置"
      />
      <SettingsSection label="伴读桌宠">
        <CompanionPreferenceForm />
      </SettingsSection>
    </main>
  );
}
