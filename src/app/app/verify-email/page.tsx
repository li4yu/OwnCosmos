import { redirect } from "next/navigation";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { requireSession } from "@/lib/session";

export default async function VerifyEmailPage() {
  const session = await requireSession();
  if (session.user.emailVerified) {
    redirect("/app");
  }

  return (
    <main>
      <VerifyEmailPanel email={session.user.email} />
    </main>
  );
}
