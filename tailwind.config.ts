import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#070b12",
          900: "#0f172a",
          800: "#162033",
          700: "#243044"
        },
        amberTrust: "#f59e0b",
        cyanData: "#22d3ee",
        emeraldGain: "#34d399",
        roseRisk: "#fb7185"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(2, 6, 23, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
