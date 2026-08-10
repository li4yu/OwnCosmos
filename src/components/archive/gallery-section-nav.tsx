"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PoeticName } from "@/components/ui/poetic-name";
import { GALLERY_SECTIONS, matchGallerySection } from "@/lib/gallery-sections";

/** 馆藏内三级分区 */
export function GallerySectionNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = matchGallerySection(pathname, searchParams.get("section"));

  return (
    <nav
      aria-label="馆藏分区"
      className="flex flex-wrap gap-1 rounded-lg border border-[var(--line)] bg-[var(--field-bg)]/40 p-1"
    >
      {GALLERY_SECTIONS.map((sec) => {
        const isActive = active?.id === sec.id;
        return (
          <button
            key={sec.id}
            type="button"
            onClick={() => router.push(sec.href)}
            className={`rounded-md px-3 py-1.5 text-sm tracking-[0.08em] transition ${
              isActive
                ? "bg-[var(--panel)] text-[var(--paper)] shadow-sm ring-1 ring-[var(--amber)]/50"
                : "text-[var(--mist)] hover:text-[var(--paper)]"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {sec.id === "all" ? (
              sec.name
            ) : (
              <PoeticName name={sec.name} tip={sec.tip} nestInControl />
            )}
            {!sec.ready ? (
              <span className="ml-1.5 font-mono text-[9px] tracking-wide opacity-60">
                稍后
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
