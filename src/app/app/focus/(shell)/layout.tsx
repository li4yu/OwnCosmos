import { ModuleShell } from "@/components/shell/module-shell";

/** 凝时普通页：保留模块标题与二级导航 */
export default function FocusShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell moduleId="focus">{children}</ModuleShell>;
}
