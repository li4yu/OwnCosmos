import { ReflectMirror } from "@/components/reflect/reflect-mirror";
import { requireSession } from "@/lib/session";
import { queryArchiveItems } from "@/services/archive";

type Props = {
  searchParams: Promise<{ view?: string }>;
};

export default async function ReflectPage({ searchParams }: Props) {
  const session = await requireSession();
  const sp = await searchParams;
  const { items } = await queryArchiveItems(session.user.id, {
    inKnowledge: true,
    page: 1,
    pageSize: 40,
  });

  const view =
    sp.view === "period" || sp.view === "dual" || sp.view === "traces"
      ? sp.view
      : "echo";

  return (
    <ReflectMirror
      initialView={view}
      archives={items.map((i) => ({
        id: i.id,
        title: i.title,
        type: i.type,
        archivedAt: i.archivedAt.toISOString().slice(0, 10),
      }))}
    />
  );
}
