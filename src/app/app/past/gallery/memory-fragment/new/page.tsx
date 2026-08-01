import { FragmentEditor } from "@/components/archive/fragment-editor";
import { requireSession } from "@/lib/session";

export default async function NewMemoryFragmentPage() {
  await requireSession();
  return (
    <main>
      <FragmentEditor mode="create" />
    </main>
  );
}
