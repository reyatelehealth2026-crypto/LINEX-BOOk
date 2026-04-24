import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy LINE green (kept for compat with old buttons)
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#06c755",
          600: "#05b14b",
          700: "#049040",
          800: "#046c33",
          900: "#064e3b",
        },
        // Primary accent — Forest green (editorial)
        forest: {
          50: "#eef5ef",
          100: "#d4e6d6",
          200: "#a8ccab",
          300: "#7aaf7f",
          400: "#4e8a55",
          500: "#2f6a37",
          600: "#1f4f28",
          700: "#15391d",
          800: "#0d2614",
          900: "#06160a",
        },
        // Cream paper backgrounds
        paper: {
          0: "#ffffff",
          1: "#faf7f0",
          2: "#f5f0e4",
          3: "#ebe5d4",
          4: "#e0d8c0",
        },
        // Secondary accents
        ochre: {
          200: "#e8d6a8",
          500: "#b5832d",
          700: "#6a4816",
        },
        clay: {
          200: "#e6c3b2",
          500: "#a8523a",
          700: "#6a2a19",
        },
        sage: {
          200: "#d1dcca",
          500: "#8aa382",
          700: "#324a2a",
        },
        // Neutrals — remapped to warm forest-tinted greys so the whole app
        // warms up without touching every `text-ink-*` / `bg-ink-*` callsite.
        ink: {
          50: "#faf7f0",
          100: "#eeeee7",
          200: "#e2e3dc",
          300: "#c2c7bf",
          400: "#96a097",
          500: "#6b7a70",
          600: "#4a5a50",
          700: "#2e3f35",
          800: "#1a2a22",
          900: "#0f1c17",
          950: "#06160a",
        },
        accent: {
          amber: "#b5832d",
          rose: "#a8523a",
          sky: "#3a5f7a",
          violet: "#8aa382",
        },
        // Editorial overrides of Tailwind's default state tones. Pages
        // across LIFF/admin use amber/rose/emerald/orange for semantic
        // state (pending, danger, success). Re-tinting here means we
        // don't have to chase every `bg-amber-*` callsite individually.
        amber: {
          50:  "#faf5e8",
          100: "#f4e8cc",
          200: "#e8d6a8",
          300: "#dcc088",
          400: "#c9a55a",
          500: "#b5832d",
          600: "#946924",
          700: "#6a4816",
          800: "#4a3110",
          900: "#2e1e0a",
        },
        rose: {
          50:  "#f9ede7",
          100: "#f0d6c8",
          200: "#e6c3b2",
          300: "#d9a48a",
          400: "#c47d5e",
          500: "#a8523a",
          600: "#873e2a",
          700: "#6a2a19",
          800: "#4a1d11",
          900: "#2e120a",
        },
        emerald: {
          50:  "#eef5ef",
          100: "#d4e6d6",
          200: "#a8ccab",
          300: "#7aaf7f",
          400: "#4e8a55",
          500: "#2f6a37",
          600: "#1f4f28",
          700: "#15391d",
          800: "#0d2614",
          900: "#06160a",
        },
        orange: {
          50:  "#f9ede7",
          100: "#f0d6c8",
          200: "#e6c3b2",
          300: "#d9a48a",
          400: "#c47d5e",
          500: "#a8523a",
          600: "#873e2a",
          700: "#6a2a19",
          800: "#4a1d11",
          900: "#2e120a",
        },
      },
      fontFamily: {
        sans: [
          "'Mitr'",
          "ui-sans-serif",
          "system-ui",
          "'Noto Sans Thai'",
          "sans-serif",
        ],
        display: [
          "'Mitr'",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        serif: ["'Mitr'", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 28 23 / 0.04), 0 1px 3px rgb(15 28 23 / 0.06)",
        lift: "0 4px 12px rgb(15 28 23 / 0.06), 0 2px 4px rgb(15 28 23 / 0.04)",
        pop: "0 12px 32px rgb(15 28 23 / 0.08), 0 4px 8px rgb(15 28 23 / 0.04)",
        editorial:
          "0 24px 56px rgb(15 28 23 / 0.12), 0 8px 16px rgb(15 28 23 / 0.06)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 380ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
