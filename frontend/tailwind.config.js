/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        copper: {
          DEFAULT: "#C8956C",
          light: "rgba(200, 149, 108, 0.12)",
          glow: "rgba(200, 149, 108, 0.20)",
        },
        offwhite: "#FAFAFA",
        matte: "#1A1A1A",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        serif: ["Playfair Display", "serif"],
        display: ["'Cormorant Garamond'", "serif"],
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
