import { Suspense } from "react";
import { GuestAtmosphereLanding } from "@/components/landing/guest-atmosphere-landing";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  return (
    <Suspense
      fallback={
        <div className="atmosphere-wash flex min-h-screen items-center justify-center text-sm text-[var(--mist)]">
          载入中…
        </div>
      }
    >
      <GuestAtmosphereLanding
        loggedIn={Boolean(session)}
        userName={session?.user.name}
      />
    </Suspense>
  );
}
