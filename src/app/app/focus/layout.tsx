import { ModuleShell } from "@/components/shell/module-shell";

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell moduleId="focus">{children}</ModuleShell>;
}
