import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#06c755", // LINE green
          600: "#05b14b",
          700: "#049040"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "'Noto Sans Thai'", "sans-serif"]
      }
    }
  },
  plugins: []
};
export default config;
