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

        // --- Sistema "Constelación" (rediseño) ---
        mist: "#F4F1F5",
        tinta: "#1C1A1E",
        "slate-ink": "#3E3A44",
        muted: "#6B6672",
        pebble: "#B9B3BD",
        faint: "#E7E3EA",
        violeta: "#6D3EF4",
        "violeta-accion": "#5433EB",
        "violeta-profundo": "#3F22C4",
        "violeta-tinta": "#2A1B5E",
        "violet-wash": "#C6B5F3",
        terracota: "#C27F5B",
        arena: "#D8C3A5",
        salvia: "#A9BFA8",
        cacao: "#8A6A4F",
        exito: "#2E7D5B",
        peligro: "#B3261E",
        advertencia: "#B26A00",
        info: "#3A6EA5",
      },
      fontFamily: {
        body: ["Montserrat", "sans-serif"],
        display: ["Fraunces", "serif"],
        constelacion: ['"Inter Tight"', "Inter", "sans-serif"],
      },
      boxShadow: {
        "constelacion-card": "0 20px 60px rgba(28, 26, 30, 0.10)",
        "constelacion-float": "0 18px 45px rgba(28, 26, 30, 0.14)",
        "constelacion-violet": "0 4px 24px rgba(69, 36, 219, 0.45)",
      },
    },
  },
  plugins: [],
}