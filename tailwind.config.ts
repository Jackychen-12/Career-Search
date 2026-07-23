import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["selector", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ededff",
          100: "#dcdcff",
          400: "#7c6fff",
          500: "#5b4cff",
          600: "#4a3de6",
          700: "#3a2ecc",
        },
        coral: {
          DEFAULT: "#FF6B4A",
          light: "rgba(255,107,74,0.10)",
        },
        cyan: {
          DEFAULT: "#1ABCFE",
          light: "rgba(26,188,254,0.10)",
        },
        nav: {
          DEFAULT: "#1f2937",
          light: "#f3f4f6",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Segoe UI",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "Roboto Mono",
          "Fira Code",
          "monospace",
        ],
      },
      borderRadius: {
        aurora: "16px",
        "aurora-sm": "12px",
        "aurora-xs": "8px",
      },
    },
  },
  plugins: [],
};

export default config;
