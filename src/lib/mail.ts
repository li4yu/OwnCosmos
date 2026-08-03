import nodemailer from "nodemailer";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
};

/**
 * 发信：配置了 SMTP_* 则走 SMTP；否则把正文打到控制台（本地开发可用）。
 * 失败会抛错，便于注册/重置流程向用户提示。
 */
export async function sendMail({ to, subject, text }: SendMailInput) {
  const host = process.env.SMTP_HOST?.trim();
  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "自宇 <noreply@localhost>";

  if (!host) {
    console.info(
      `[mail:dev] to=${to}\nsubject=${subject}\n${text}\n---`,
    );
    return { ok: true as const, mode: "console" as const };
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const secure =
    process.env.SMTP_SECURE === "1" ||
    process.env.SMTP_SECURE === "true" ||
    port === 465;

  if (!user || !pass) {
    throw new Error("SMTP 已配置主机但缺少 SMTP_USER / SMTP_PASS");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({ from, to, subject, text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mail:smtp] send failed to=${to}: ${msg}`);
    throw new Error(
      /535|authentication failed|EAUTH/i.test(msg)
        ? "邮件服务器登录失败：请检查 .env.local 中 SMTP_USER 与授权码 SMTP_PASS（163 须用客户端授权码，不是登录密码）"
        : `邮件发送失败：${msg}`,
    );
  }
  return { ok: true as const, mode: "smtp" as const };
}
