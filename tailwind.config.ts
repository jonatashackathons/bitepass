import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        culinary: {
          bg: "#FAF9F5",
          surface: "#FFFFFF",
          card: "#FDFDFB",
          border: "#EAE7DF",
          subtle: "#F4F1EA",
          text: "#1C1917",
          muted: "#78716C",
          terracotta: "#E05A38",
          amber: "#D97706",
          sage: "#15803D",
        },
        paypal: {
          blue: "#0070BA",
          dark: "#003087",
          hover: "#005ea6",
          light: "#EBF3FC",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        culinary: "0 10px 30px -10px rgba(28, 25, 23, 0.08), 0 4px 12px -2px rgba(28, 25, 23, 0.04)",
        "culinary-lg": "0 20px 40px -15px rgba(28, 25, 23, 0.12), 0 8px 16px -4px rgba(28, 25, 23, 0.06)",
        "culinary-hover": "0 25px 50px -12px rgba(224, 90, 56, 0.15), 0 10px 20px -5px rgba(28, 25, 23, 0.06)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in-up": "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
