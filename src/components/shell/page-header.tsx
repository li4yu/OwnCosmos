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
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        {backHref ? (
          guardLeave ? (
            <GuardedBackLink href={backHref} label={backLabel} />
          ) : (
            <Link
              href={backHref}
              className="mb-1 inline-flex items-center gap-1 rounded border border-[var(--line)] px-2 py-0.5 text-[11px] tracking-[0.06em] text-[var(--mist)] transition hover:border-[var(--amber)] hover:text-[var(--amber)]"
            >
              ← {backLabel}
            </Link>
          )
        ) : null}
        {eyebrow ? (
          <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--teal)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-base font-semibold tracking-[0.1em] text-[var(--paper)]">
          {title}
        </h1>
        {description ? (
          <div className="mt-0.5 text-xs leading-5 text-[var(--mist)]">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
