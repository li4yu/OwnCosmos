import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        void: "var(--void)",
        ink: "var(--ink)",
        mist: "var(--mist)",
        paper: "var(--paper)",
        amber: "var(--amber)",
        teal: "var(--teal)",
      },
      fontFamily: {
        display: ["var(--font-noto-serif)", "Songti SC", "serif"],
        latin: ["var(--font-cormorant)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
