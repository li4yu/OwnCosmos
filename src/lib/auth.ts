import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

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
    },
    changeEmail: {
      enabled: false,
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type ThemeId = "night" | "khaki";

export function isThemeId(value: unknown): value is ThemeId {
  return value === "night" || value === "khaki";
}
