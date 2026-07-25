import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        theme: { type: "string", required: true },
        bio: { type: "string", required: false },
        essayIdleHours: { type: "number", required: true },
      },
    }),
  ],
});
