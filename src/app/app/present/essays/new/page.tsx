import { EssayEditor } from "@/components/essays/essay-editor";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";

export default async function NewEssayPage() {
  await requireSession();

  return (
    <main>
      <PageHeader
        title="新建随笔"
        backHref="/app/present/essays"
        backLabel="返回流思笺"
        guardLeave
        description="手动保存；未保存离开会弹出确认小窗"
      />
      <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
        <EssayEditor mode="create" />
      </div>
    </main>
  );
}
