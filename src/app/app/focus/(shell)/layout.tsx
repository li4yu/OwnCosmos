import { ModuleShell } from "@/components/shell/module-shell";

/** 凝时总览 / 专注记录：与其它模块同款镜面壳 */
export default function FocusShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell moduleId="focus">{children}</ModuleShell>;
}
