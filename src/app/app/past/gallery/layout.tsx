import { Suspense } from "react";
import { GallerySectionNav } from "@/components/archive/gallery-section-nav";
import { PoeticName } from "@/components/ui/poetic-name";

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg tracking-[0.12em] text-[var(--paper)]">
          <PoeticName
            name="拾忆馆藏"
            tip="统一收纳流入的随笔、规划归档、专注记录，以及你上传的照片与文字回忆"
          />
        </h2>
        <p className="mt-2 text-sm text-[var(--mist)]">
          馆藏总库，详情只读；分区含随笔沉淀、规划归档、轮期/日课计次归档、凝录。
        </p>
      </div>
      <Suspense fallback={<div className="h-10 rounded-lg border border-[var(--line)]" />}>
        <GallerySectionNav />
      </Suspense>
      {children}
    </div>
  );
}
