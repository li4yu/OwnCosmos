import {
  ChangePasswordForm,
  DeleteAccountForm,
} from "@/components/settings/account-security-forms";
import { SettingsSection } from "@/components/settings/settings-section";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";

export default async function AccountSettingsPage() {
  const session = await requireSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title="账号与安全"
        eyebrow="ACCOUNT"
        description={`已登录：${session.user.email}${
          session.user.emailVerified ? " · 邮箱已验证" : " · 邮箱未验证"
        }`}
        backHref="/app/settings"
        backLabel="返回设置"
      />
      <SettingsSection label="修改密码">
        <ChangePasswordForm />
      </SettingsSection>
      <SettingsSection
        label="注销账号"
        description="危险操作：将清除本账号下业务数据，不可恢复。"
      >
        <DeleteAccountForm />
      </SettingsSection>
    </main>
  );
}
