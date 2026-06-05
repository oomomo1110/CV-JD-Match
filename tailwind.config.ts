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
        ink: "#14213d",
        muted: "#627089",
        line: "#dde5f3",
        paper: "#f6f9ff",
        brand: "#19a889",
        coral: "#ff6f61",
        sky: "#2f80ed",
        violet: "#7c5cff",
        lemon: "#ffe680",
        mint: "#d9fff3",
        app: "#f5f8ff"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(24, 33, 47, 0.08)",
        pop: "0 18px 45px rgba(47, 128, 237, 0.12)",
        button: "0 10px 22px rgba(20, 33, 61, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
