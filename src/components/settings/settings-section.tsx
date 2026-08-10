import type { ReactNode } from "react";

type SettingsSectionProps = {
  label: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** 设置页统一分块：眉标 + 可选说明 + 内容 */
export function SettingsSection({
  label,
  description,
  children,
  className = "",
}: SettingsSectionProps) {
  return (
    <section
      className={`flex flex-col rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-3.5 ${className}`}
    >
      <header className="mb-2.5 border-b border-[color-mix(in_srgb,var(--line)_70%,transparent)] pb-2">
        <p className="font-mono text-[9px] tracking-[0.18em] text-[var(--teal)]">
          {label}
        </p>
        {description ? (
          <div className="mt-1 text-xs leading-relaxed text-[var(--mist)]">
            {description}
          </div>
        ) : null}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}
