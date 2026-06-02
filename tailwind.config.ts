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
        ink: "#18212f",
        muted: "#5b6472",
        line: "#d9dee7",
        paper: "#f7f8fb",
        brand: "#1f7a68"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(24, 33, 47, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
