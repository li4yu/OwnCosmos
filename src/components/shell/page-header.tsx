import Link from "next/link";
import type { ReactNode } from "react";
import { GuardedBackLink } from "@/components/ui/guarded-back-link";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  guardLeave?: boolean;
  actions?: ReactNode;
};

/** 模块内页标题（顶栏已有模块切换，此处只负责子页语境） */
export function PageHeader({
  title,
  eyebrow,
  description,
  backHref,
  backLabel = "返回",
  guardLeave = false,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {backHref ? (
          guardLeave ? (
            <GuardedBackLink href={backHref} label={backLabel} />
          ) : (
            <Link
              href={backHref}
              className="mb-3 inline-flex items-center gap-1 rounded border border-[var(--line)] px-2.5 py-1 text-xs tracking-[0.06em] text-[var(--mist)] transition hover:border-[var(--amber)] hover:text-[var(--amber)]"
            >
              ← {backLabel}
            </Link>
          )
        ) : null}
        {eyebrow ? (
          <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--teal)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-[0.14em] text-[var(--paper)]">
          {title}
        </h1>
        {description ? (
          <div className="mt-2 text-sm text-[var(--mist)]">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
