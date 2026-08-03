import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
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
      },
    }),
  ],
});
