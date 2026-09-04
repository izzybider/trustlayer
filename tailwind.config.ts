import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F4",
        panel: "#FFFDF9",
        ink: "#141414",
        "ink-soft": "#3F3F3D",
        muted: "#6E6C66",
        line: "#E2DED5",
        "line-strong": "#CFC9BC",
        accent: "#3C5A78",
        "accent-soft": "#EBF0F5",
        warn: "#8A6A2F",
        "warn-soft": "#F5EFE2",
        danger: "#8C4A3F",
        "danger-soft": "#F6EAE7",
        ok: "#456B52",
        "ok-soft": "#EAF0EB",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: { content: "1200px" },
    },
  },
  plugins: [],
};

export default config;
