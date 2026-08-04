import {
  ChangePasswordForm,
  DeleteAccountForm,
} from "@/components/settings/account-security-forms";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { ArchivePreferenceForm } from "@/components/settings/archive-preference-form";
import { ExportChartsPanel } from "@/components/settings/export-charts-panel";
import { ExportOpenContent } from "@/components/settings/export-open-content";
import { FocusPreferenceForm } from "@/components/settings/focus-preference-form";
import { NotifyPreferenceForm } from "@/components/settings/notify-preference-form";
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
    <main className="flex flex-col gap-3">
      <PageHeader
        title="设置"
        eyebrow="SETTINGS"
        description="外观、归档、通知、凝时、账号与数据导出"
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
          凝时
        </p>
        <div className="mt-1.5">
          <FocusPreferenceForm
            initialFocusDnd={Boolean(user.focusDnd)}
            initialCountdownDefaultMs={
              user.focusCountdownDefaultMs ?? DEFAULT_FOCUS_COUNTDOWN_MS
            }
          />
        </div>
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          账号与安全
        </p>
        <p className="mt-0.5 text-xs text-[var(--mist)]">
          已登录：{session.user.email}
          {session.user.emailVerified ? " · 邮箱已验证" : " · 邮箱未验证"}
        </p>
        <div className="mt-2 flex flex-col gap-4">
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
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          AI 开发
        </p>
        <p className="mt-0.5 text-xs text-[var(--mist)]">
          Phase 19 临时入口，用于检查语义召回；不进顶栏。
        </p>
        <Link
          href="/app/ai/recall"
          className="mt-1.5 inline-block text-sm text-[var(--teal)] underline-offset-2 hover:underline"
        >
          打开 RAG 召回测试 →
        </Link>
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          数据导出
        </p>
        <div className="mt-1.5">
          <ExportOpenContent />
        </div>
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          图表导出
        </p>
        <div className="mt-1.5">
          <ExportChartsPanel />
        </div>
      </section>
    </main>
  );
}
