/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0d1b2a",
        paper: "#f7f5ed",
        sidebar: "#111a2e",
        sidebarActive: "#1e2d4a",
        accentGold: "#d9a036",
        greenCustom: "#1f7a5c",
      },
      fontFamily: {
        body: ["Montserrat", "sans-serif"],
        display: ["Fraunces", "serif"],
      },
    },
  },
  plugins: [],
}