import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0A5D6B",
          accent: "#14A3B8",
          light: "#0D7A8C",
          dark: "#073D47"
        },
        status: {
          completed: "#22c55e",
          progress: "#f59e0b",
          missing: "#ef4444",
          future: "#1e3a8a",
          notstarted: "#9ca3af",
          na: "#3b82f6"
        }
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
