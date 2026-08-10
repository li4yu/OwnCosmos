/**
 * 凝时根布局：透传即可。
 * - 总览 / 专注记录在 (shell) 下套镜面壳（与其它模块一致）
 * - 正向计时 / 倒计时在 (shell) 外，自行全屏舱，不进镜面
 */
export default function FocusRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
