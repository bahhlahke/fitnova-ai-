import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fn: {
          bg: "#f5f7fb",
          "bg-alt": "#eef3fb",
          surface: "#ffffff",
          "surface-hover": "#f7f9ff",
          ink: "#16213a",
          muted: "#495574",
          border: "#dbe3f2",
          primary: "#335cff",
          "primary-dim": "#2848c8",
          accent: "#15b69c",
          danger: "#c43d2f",
          teal: "#15b69c",
          "teal-dim": "#0f917e",
          magenta: "#335cff",
          "magenta-dim": "#2848c8",
          charcoal: "#eef3fb",
          black: "#16213a",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
        display: ["var(--font-fraunces)", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      spacing: {
        touch: "44px",
        "touch-lg": "48px",
      },
      minHeight: {
        touch: "44px",
        "touch-lg": "48px",
      },
      minWidth: {
        touch: "44px",
        "touch-lg": "48px",
      },
      maxWidth: {
        shell: "72rem",
      },
      boxShadow: {
        "fn-card": "0 18px 45px -28px rgba(17, 36, 77, 0.38)",
        "fn-soft": "0 8px 20px -14px rgba(17, 36, 77, 0.35)",
      },
      borderRadius: {
        xl2: "1.1rem",
      },
    },
  },
  plugins: [],
};

export default config;
