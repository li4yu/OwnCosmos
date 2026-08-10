/** 自省为单页镜面，不挂侧栏子模块壳 */
export default function ReflectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="oc-reflect-stage">{children}</div>;
}
