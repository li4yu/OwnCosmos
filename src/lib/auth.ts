import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { sendMail } from "@/lib/mail";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    /** 登录不拦；业务页由 /app 布局按 emailVerified 拦截 */
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    /** 密码：Better Auth 默认 scrypt 哈希写入 account.password，不明文 */
  },
  emailVerification: {
    sendOnSignUp: false,
    /** 验证邮箱 OTP 成功后签发会话（否则未登录状态下验证成功也进不了 /app） */
    autoSignInAfterVerification: true,
  },
  user: {
    additionalFields: {
      theme: {
        type: "string",
        required: true,
        defaultValue: "night",
        input: true,
      },
      bio: {
        type: "string",
        required: false,
        defaultValue: "",
        input: true,
      },
      essayIdleHours: {
        type: "number",
        required: true,
        defaultValue: 48,
        input: true,
      },
      anniversaryRemind: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: true,
      },
      notifyEnabled: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: true,
      },
      notifyDueReminder: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: true,
      },
      focusDnd: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: true,
      },
      focusCountdownDefaultMs: {
        type: "number",
        required: true,
        defaultValue: 1_500_000,
        input: true,
      },
      aiEnabled: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: true,
      },
    },
    changeEmail: {
      enabled: false,
    },
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 5,
      storeOTP: "hashed",
      /** 注册发码由注册页显式调用，避免与 override 钩子错位导致「提示已发实际未发」 */
      sendVerificationOnSignUp: false,
      overrideDefaultEmailVerification: true,
      /** 验证码登录不允许自动开号（须走注册填密码） */
      disableSignUp: true,
      generateOTP() {
        // 强制 6 位纯数字，避免与客户端校验不一致
        let otp = "";
        const bytes = new Uint8Array(6);
        crypto.getRandomValues(bytes);
        for (let i = 0; i < 6; i++) otp += String(bytes[i]! % 10);
        return otp;
      },
      async sendVerificationOTP({ email, otp, type }) {
        const code = String(otp).replace(/\D/g, "").slice(0, 6);
        if (code.length !== 6) {
          throw new Error("验证码生成异常，请重试");
        }
        const subject =
          type === "forget-password"
            ? "自宇 · 重置密码验证码"
            : type === "email-verification"
              ? "自宇 · 邮箱验证码"
              : "自宇 · 登录验证码";
        const purpose =
          type === "forget-password"
            ? "重置密码"
            : type === "email-verification"
              ? "验证邮箱"
              : "登录";
        await sendMail({
          to: email,
          subject,
          text: `【自宇】您的${purpose}验证码（6 位）：\n\n${code}\n\n5 分钟内有效，请勿泄露给他人。\n若非本人操作，请忽略本邮件。`,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type ThemeId = "night" | "khaki";

export function isThemeId(value: unknown): value is ThemeId {
  return value === "night" || value === "khaki";
}
