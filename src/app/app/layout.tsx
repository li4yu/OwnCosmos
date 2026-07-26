import { XingluomaoCompanion } from "@/components/companion/xingluomao";
import { AppChrome } from "@/components/shell/app-chrome";
import { requireSession } from "@/lib/session";

export default async function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="atmosphere-wash min-h-screen">
      <AppChrome
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      <XingluomaoCompanion userName={session.user.name} />
    </div>
  );
}
