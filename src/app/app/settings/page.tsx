import {
  ChangePasswordForm,
  DeleteAccountForm,
} from "@/components/settings/account-security-forms";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { ArchivePreferenceForm } from "@/components/settings/archive-preference-form";
import { CompanionPreferenceForm } from "@/components/settings/companion-preference-form";
import { ExportChartsPanel } from "@/components/settings/export-charts-panel";
import { ExportOpenContent } from "@/components/settings/export-open-content";
import { FocusPreferenceForm } from "@/components/settings/focus-preference-form";
import { NotifyPreferenceForm } from "@/components/settings/notify-preference-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { DEFAULT_FOCUS_COUNTDOWN_MS } from "@/db/schema";
import { requireSession } from "@/lib/session";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    theme?: string;
    essayIdleHours?: number;
    anniversaryRemind?: boolean;
    notifyEnabled?: boolean;
    notifyDueReminder?: boolean;
    focusDnd?: boolean;
    focusCountdownDefaultMs?: number;
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader
        title="设置"
        eyebrow="SETTINGS"
        description="外观、偏好、伴读、账号与导出"
        backHref="/app"
        backLabel="返回首页"
      />

      <SettingsSection
        label="外观"
        description="三套主题；墨白为银月炭黑。登录后写入账号，各端同步。"
      >
        <AppearanceForm initialTheme={user.theme} />
      </SettingsSection>

      <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
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

        <SettingsSection
          label="通知与回望"
          description="桌面通知与往年今日轻提示。"
        >
          <NotifyPreferenceForm
            initialNotifyEnabled={user.notifyEnabled ?? true}
            initialNotifyDueReminder={user.notifyDueReminder ?? true}
            initialAnniversaryRemind={Boolean(user.anniversaryRemind)}
          />
        </SettingsSection>
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
        <SettingsSection
          label="凝时"
          description="倒计时默认时长与专注勿扰。"
        >
          <FocusPreferenceForm
            initialFocusDnd={Boolean(user.focusDnd)}
            initialCountdownDefaultMs={
              user.focusCountdownDefaultMs ?? DEFAULT_FOCUS_COUNTDOWN_MS
            }
          />
        </SettingsSection>

        <SettingsSection
          label="账号与安全"
          description={`已登录：${session.user.email}${
            session.user.emailVerified ? " · 邮箱已验证" : " · 邮箱未验证"
          }`}
        >
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-xs tracking-[0.06em] text-[var(--paper)]">
                修改密码
              </p>
              <ChangePasswordForm />
            </div>
            <div className="border-t border-[var(--line)] pt-3">
              <p className="mb-1.5 text-xs tracking-[0.06em] text-[var(--danger)]">
                注销账号
              </p>
              <DeleteAccountForm />
            </div>
          </div>
        </SettingsSection>
      </div>

      <SettingsSection
        label="伴读桌宠"
        description="定制形象、称呼与语气、主动气泡频控与勿扰；对话总闸仍为环境变量 AI_ENABLED。"
      >
        <CompanionPreferenceForm />
      </SettingsSection>

      <div className="grid gap-3 md:grid-cols-3 md:items-stretch">
        <SettingsSection label="数据导出">
          <ExportOpenContent />
        </SettingsSection>
        <SettingsSection label="图表导出">
          <ExportChartsPanel />
        </SettingsSection>
        <SettingsSection
          label="AI 开发"
          description="伴读在右下角；此处保留召回测试入口。"
        >
          <Link
            href="/app/ai/recall"
            className="inline-block text-sm text-[var(--teal)] underline-offset-2 hover:underline"
          >
            打开 RAG 召回测试 →
          </Link>
        </SettingsSection>
      </div>
    </main>
  );
}
