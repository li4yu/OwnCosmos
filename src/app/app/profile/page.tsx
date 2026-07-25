import { AppHeader } from "@/components/shell/app-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { requireSession } from "@/lib/session";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    bio?: string | null;
  };

  return (
    <div className="atmosphere-wash min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <AppHeader
          title="编辑资料"
          eyebrow="PROFILE"
          backHref="/app"
          backLabel="返回"
          user={{ name: user.name, email: user.email, image: user.image }}
        />

        <main className="flex flex-1 flex-col gap-8">
          <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
            <ProfileForm
              email={user.email}
              initialName={user.name}
              initialImage={user.image}
              initialBio={user.bio}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
