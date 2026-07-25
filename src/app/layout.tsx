import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_SC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("owncosmos-theme");if(t==="khaki"||t==="night")document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${notoSerif.variable} ${cormorant.variable} ${jetbrains.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
