import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#140249",
        secondary: "#FE9A70",
        ink: "#1A1626",
        purple: "#846AE6",
        pink: "#FF7282",
        mist: "#EDE8F5",
        surface: "#FFFFFF",
        info: "#846AE6",
        success: "#70C08E",
        warning: "#F4A261",
        error: "#D94848",
      },
      fontFamily: {
        sans: ["var(--font-ubuntu)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 10px 30px -15px rgba(20, 2, 73, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
