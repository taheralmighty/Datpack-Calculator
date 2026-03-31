/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        copper: {
          DEFAULT: "#C8956C",
          light: "rgba(200,149,108,0.15)",
          dark: "#A0704A",
        },
        brand: {
          bg: "#FAFAFA",
          surface: "#FFFFFF",
          text: "#1A1A1A",
          secondary: "#555555",
          border: "#E8E8E6",
          "dark-bg": "#111111",
          "dark-surface": "#1A1A1A",
          "dark-text": "#F0EDE8",
          "dark-secondary": "#A3A3A3",
          "dark-border": "#2A2A2A",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "pulse-copper": "pulse-copper 1.5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        "pulse-copper": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.4 },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
