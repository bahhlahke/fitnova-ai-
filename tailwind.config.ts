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
          bg: "#0A0A0B",
          "bg-alt": "#161618",
          surface: "#1C1C1E",
          "surface-hover": "#2C2C2E",
          ink: "#FFFFFF",
          muted: "#A1A1AA",
          border: "#27272A",
          primary: "#FFFFFF",
          "primary-dim": "#E4E4E7",
          accent: "#0AD9C4",
          danger: "#EF4444",
          teal: "#0AD9C4",
          "teal-dim": "#08B4A2",
          magenta: "#FFFFFF",
          "magenta-dim": "#E4E4E7",
          charcoal: "#161618",
          black: "#000000",
        },
      },
      fontFamily: {
        sans: ["Inter", "var(--font-manrope)", "sans-serif"],
        display: ["var(--font-fraunces)", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      spacing: {
        touch: "44px",
        "touch-lg": "56px",
      },
      minHeight: {
        touch: "44px",
        "touch-lg": "56px",
      },
      minWidth: {
        touch: "44px",
        "touch-lg": "56px",
      },
      maxWidth: {
        shell: "80rem",
      },
      boxShadow: {
        "fn-card": "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        "fn-soft": "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
      },
      borderRadius: {
        xl2: "1.5rem",
        xl3: "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
