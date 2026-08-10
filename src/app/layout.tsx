import type { Metadata } from "next";
import { ThemeSyncFromSession } from "@/components/theme-toggle";
import "./globals.css";

/**
 * 全部字体走 Google Fonts <link>，避开 next/font + Turbopack
 * 对 Noto Serif SC（CJK）的已知 Module not found。
 */

export const metadata: Metadata = {
  title: "自宇 · My Own Cosmos",
  description: "时序式个人思绪、规划与专注系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="night" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&family=Noto+Serif+SC:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("owncosmos-theme");if(t==="khaki"||t==="night"||t==="mono")document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeSyncFromSession />
        {children}
      </body>
    </html>
  );
}
