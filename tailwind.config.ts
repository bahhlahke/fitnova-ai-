import type { Config } from "tailwindcss";

/** FitNova AI — Concept 1: Futuristic Precision
 * Electric teal + magenta on charcoal/black
 * Mobile-first; min 44px touch targets via spacing
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Concept 1 branding
        fn: {
          teal: "#00e5cc",
          "teal-dim": "#00b8a3",
          magenta: "#e91e8c",
          "magenta-dim": "#b8186e",
          charcoal: "#1a1a1d",
          black: "#0d0d0f",
          surface: "#252529",
          "surface-hover": "#2e2e33",
          muted: "#6b6b70",
          border: "#3a3a40",
        },
      },
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      spacing: {
        "touch": "44px",
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
    },
  },
  plugins: [],
};

export default config;
