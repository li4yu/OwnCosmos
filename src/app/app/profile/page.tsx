import { ProfileForm } from "@/components/settings/profile-form";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    bio?: string | null;
  };

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="编辑资料"
        eyebrow="PROFILE"
        backHref="/app"
        backLabel="返回首页"
      />

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
        <ProfileForm
          email={user.email}
          initialName={user.name}
          initialImage={user.image}
          initialBio={user.bio}
        />
      </section>
    </main>
  );
}
