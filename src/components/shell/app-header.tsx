import Link from "next/link";
import { UserMenu } from "@/components/shell/user-menu";

type AppHeaderProps = {
  title: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

export function AppHeader({
  title,
  eyebrow = "MY OWN COSMOS",
  backHref,
  backLabel = "返回",
  user,
}: AppHeaderProps) {
  return (
    <header className="mb-10 flex items-center justify-between gap-4">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1 rounded border border-[var(--line)] px-2.5 py-1 font-mono text-[10px] tracking-widest text-[var(--mist)] transition hover:border-[var(--amber)] hover:text-[var(--amber)]"
          >
            ← {backLabel}
          </Link>
        ) : null}
        <Link href="/app" className="block">
          <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.2em] text-[var(--amber)]">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[0.16em] text-[var(--paper)] sm:text-3xl">
            {title}
          </h1>
        </Link>
      </div>
      <UserMenu name={user.name} email={user.email} image={user.image} />
    </header>
  );
}
