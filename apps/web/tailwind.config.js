/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Syne", "sans-serif"],
        serif: ["Fraunces", "serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "3px",
      },
      colors: {
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        ink3: "var(--ink3)",
        side: "var(--side)",
        amber: "var(--amber)",
        "amber-soft": "var(--amber-soft)",
        "amber-ink": "var(--amber-ink)",
        red: "var(--red)",
        "red-soft": "var(--red-soft)",
        green: "var(--green)",
        "green-soft": "var(--green-soft)",
        blue: "var(--blue)",
        "blue-soft": "var(--blue-soft)",
        card: "var(--card)",
        border: "var(--border)",
        border2: "var(--border2)",
        "run-title": "var(--run-banner-title)",
        "run-meta": "var(--run-banner-meta)",
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
};
