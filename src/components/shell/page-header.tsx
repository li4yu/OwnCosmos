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

/** 模块内页标题：笺页流眉题，不用胶囊返回框 */
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
    <div className="oc-page-head">
      <div className="min-w-0">
        {backHref ? (
          guardLeave ? (
            <GuardedBackLink href={backHref} label={backLabel} />
          ) : (
            <Link href={backHref} className="oc-back">
              ← {backLabel}
            </Link>
          )
        ) : null}
        {eyebrow ? <p className="oc-page-head__eyebrow">{eyebrow}</p> : null}
        <h1 className="oc-page-head__title">{title}</h1>
        {description ? (
          <div className="oc-page-head__desc">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
