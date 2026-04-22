import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#06c755", // LINE green
          600: "#05b14b",
          700: "#049040",
          800: "#046c33",
          900: "#064e3b"
        },
        linex: {
          50: "#fcfaff",
          100: "#f7f2ff",
          200: "#eee6ff",
          300: "#d4c2ff",
          400: "#b89cff",
          500: "#8f63ff",
          600: "#6d3bff",
          700: "#4d2b73",
          800: "#34204d",
          900: "#221733",
          950: "#171220"
        },
        peach: {
          50: "#fff7f3",
          100: "#ffece4",
          200: "#ffe3d8",
          300: "#ffd0bf",
          400: "#ffb59c",
          500: "#ff9b7a",
          600: "#f47f5f"
        },
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617"
        },
        accent: {
          amber: "#f59e0b",
          rose: "#f43f5e",
          sky: "#0ea5e9",
          violet: "#8b5cf6"
        }
      },
      fontFamily: {
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "'Noto Sans Thai'", "'IBM Plex Sans Thai'", "sans-serif"],
        display: ["'Inter'", "ui-sans-serif", "system-ui", "'Noto Sans Thai'", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "monospace"]
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem"
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        lift: "0 4px 12px -4px rgb(15 23 42 / 0.08)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" }
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" }
        }
      },
      animation: {
        "fade-up": "fade-up 380ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
export default config;
