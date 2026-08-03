import { redirect } from "next/navigation";

/** 重置已改为邮箱验证码流程，统一入口在忘记密码页 */
export default function ResetPasswordPage() {
  redirect("/forgot-password");
}
