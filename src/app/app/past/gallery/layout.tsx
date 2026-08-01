import Link from "next/link";
import { PoeticName } from "@/components/ui/poetic-name";

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm tracking-[0.1em] text-[var(--paper)]">
            <PoeticName
              name="拾忆馆藏"
              tip="统一收纳流入的随笔、规划归档、专注记录，以及你上传的照片与文字回忆"
            />
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--mist)]">
            左侧切分区；可筛可批量藏忆 / 抹忆。
          </p>
        </div>
        <Link
          href="/app/past/gallery/memory-fragment/new"
          className="ui-btn-primary ui-btn-sm shrink-0"
        >
          <PoeticName name="拾取碎片" tip="上传照片或文字回忆，收入馆藏" />
        </Link>
      </div>
      {children}
    </div>
  );
}
