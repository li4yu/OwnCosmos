import { ArchivePreferenceForm } from "@/components/settings/archive-preference-form";
import { FocusPreferenceForm } from "@/components/settings/focus-preference-form";
import { NotifyPreferenceForm } from "@/components/settings/notify-preference-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { DEFAULT_FOCUS_COUNTDOWN_MS } from "@/db/schema";
import { requireSession } from "@/lib/session";

export default async function PreferencesSettingsPage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    essayIdleHours?: number;
    anniversaryRemind?: boolean;
    notifyEnabled?: boolean;
    notifyDueReminder?: boolean;
    focusDnd?: boolean;
    focusCountdownDefaultMs?: number;
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title="偏好"
        eyebrow="PREFERENCES"
        description="归档节奏、通知回望与凝时默认"
        backHref="/app/settings"
        backLabel="返回设置"
      />

      <SettingsSection
        label="随笔 · 归档"
        description={
          <>
            <PoeticName
              name="自动归档"
              tip="久未改动的随笔会沉淀进昔时往；也可提前归档；小时数可在此修改"
            />
            的自动小时数
          </>
        }
      >
        <ArchivePreferenceForm initialIdleHours={user.essayIdleHours} />
      </SettingsSection>

      <SettingsSection label="通知与回望" description="桌面通知与往年今日轻提示。">
        <NotifyPreferenceForm
          initialNotifyEnabled={user.notifyEnabled ?? true}
          initialNotifyDueReminder={user.notifyDueReminder ?? true}
          initialAnniversaryRemind={Boolean(user.anniversaryRemind)}
        />
      </SettingsSection>

      <SettingsSection label="凝时" description="倒计时默认时长与专注勿扰。">
        <FocusPreferenceForm
          initialFocusDnd={Boolean(user.focusDnd)}
          initialCountdownDefaultMs={
            user.focusCountdownDefaultMs ?? DEFAULT_FOCUS_COUNTDOWN_MS
          }
        />
      </SettingsSection>
    </main>
  );
}
