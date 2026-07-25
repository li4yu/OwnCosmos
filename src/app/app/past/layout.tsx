import { ModuleShell } from "@/components/shell/module-shell";

export default function PastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell moduleId="past">{children}</ModuleShell>;
}
