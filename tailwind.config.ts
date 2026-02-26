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
          bg: "#f8f9ff",
          "bg-alt": "#eef1fb",
          "bg-dark": "#080c1a",
          "bg-dark-2": "#0f1525",
          surface: "#ffffff",
          "surface-hover": "#f4f6ff",
          "surface-glass": "rgba(255,255,255,0.72)",
          "surface-dark": "rgba(15,21,37,0.85)",
          ink: "#0d1224",
          "ink-rich": "#060911",
          muted: "#4a5578",
          "muted-light": "#8a97b8",
          border: "#dce4f5",
          "border-strong": "#b8c5e0",
          primary: "#335cff",
          "primary-dim": "#2848cc",
          "primary-light": "#eef1ff",
          "primary-glow": "rgba(51,92,255,0.18)",
          accent: "#15b69c",
          "accent-dim": "#0f917e",
          "accent-light": "#e6f9f5",
          danger: "#c43d2f",
          "danger-light": "#fff0ee",
          amber: "#f59e0b",
          violet: "#7c3aed",
          "violet-light": "#f3eeff",
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
        "section-mobile": "60px",
        "section-desktop": "100px",
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
        prose: "68ch",
      },
      boxShadow: {
        "fn-card": "0 1px 3px rgba(13,18,36,0.06), 0 12px 40px -16px rgba(13,18,36,0.18)",
        "fn-card-hover": "0 1px 3px rgba(13,18,36,0.08), 0 20px 60px -16px rgba(13,18,36,0.26)",
        "fn-soft": "0 4px 16px -6px rgba(13,18,36,0.14)",
        "fn-primary": "0 4px 24px -4px rgba(51,92,255,0.4)",
        "fn-glow": "0 0 0 3px rgba(51,92,255,0.15)",
        "fn-elevated": "0 2px 8px rgba(13,18,36,0.06), 0 24px 64px -20px rgba(13,18,36,0.28)",
        "fn-inset": "inset 0 1px 0 rgba(255,255,255,0.15)",
        "fn-dark": "0 8px 40px -8px rgba(6,9,17,0.6)",
      },
      borderRadius: {
        xl2: "1.1rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #335cff 0%, #5b4fff 50%, #7c3aed 100%)",
        "gradient-accent": "linear-gradient(135deg, #15b69c 0%, #0e9f87 100%)",
        "gradient-dark": "linear-gradient(160deg, #080c1a 0%, #0f1a35 100%)",
        "gradient-hero": "linear-gradient(to bottom, rgba(8,12,26,0) 0%, rgba(8,12,26,0.5) 50%, rgba(8,12,26,0.92) 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,244,255,0.8) 100%)",
        "gradient-mesh": "radial-gradient(at 20% 20%, rgba(51,92,255,0.12) 0%, transparent 50%), radial-gradient(at 80% 80%, rgba(21,182,156,0.10) 0%, transparent 50%), radial-gradient(at 60% 10%, rgba(124,58,237,0.08) 0%, transparent 50%)",
        "gradient-shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "scale-in": "scaleIn 0.3s ease-out both",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 2s infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(32px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(51,92,255,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(51,92,255,0.6)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
