import { ModuleShell } from "@/components/shell/module-shell";

export default function FutureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell moduleId="future">{children}</ModuleShell>;
}
