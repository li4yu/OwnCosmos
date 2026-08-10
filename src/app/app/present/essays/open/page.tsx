import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** 旧「未归档」入口并回每日随笔列表 */
export default async function OpenEssaysRedirect({ searchParams }: Props) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (String(item).trim()) q.append(key, item);
      }
    } else if (String(v).trim()) {
      q.set(key, v);
    }
  }
  const qs = q.toString();
  redirect(qs ? `/app/present/essays/daily?${qs}` : "/app/present/essays/daily");
}
