import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const params = new URLSearchParams({ auth: "login" });
  if (next) params.set("next", next);
  redirect(`/?${params.toString()}`);
}
