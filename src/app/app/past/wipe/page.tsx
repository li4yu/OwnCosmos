import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

/** 旧独立抹忆入口 → 馆藏总览（列表内可批量抹忆） */
export default async function WipeArchivesRedirect({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.type) qs.set("type", sp.type);
  if (sp.from) qs.set("from", sp.from);
  if (sp.to) qs.set("to", sp.to);
  if (sp.page) qs.set("page", sp.page);
  const suffix = qs.toString();
  redirect(suffix ? `/app/past/gallery?${suffix}` : "/app/past/gallery");
}
