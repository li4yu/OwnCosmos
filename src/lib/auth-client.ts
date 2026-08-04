import { createAuthClient } from "better-auth/react";
import {
  emailOTPClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    inferAdditionalFields({
      user: {
        theme: { type: "string", required: true },
        bio: { type: "string", required: false },
        essayIdleHours: { type: "number", required: true },
        anniversaryRemind: { type: "boolean", required: true },
        notifyEnabled: { type: "boolean", required: true },
        notifyDueReminder: { type: "boolean", required: true },
        focusDnd: { type: "boolean", required: true },
        focusCountdownDefaultMs: { type: "number", required: true },
        aiEnabled: { type: "boolean", required: true },
      },
    }),
  ],
});
