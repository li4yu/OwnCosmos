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
        description="昵称、头像与简介；邮箱只读"
        backHref="/app"
        backLabel="返回首页"
      />

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
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
