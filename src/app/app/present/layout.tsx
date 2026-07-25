import { ModuleShell } from "@/components/shell/module-shell";

export default function PresentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell moduleId="present">{children}</ModuleShell>;
}
