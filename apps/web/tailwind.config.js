/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rpg: {
          bg: "#0a0c10",
          card: "#13171f",
          "card-hover": "#181d27",
          inner: "#0d1016",
          border: "#242b38",
          gold: "#f5c518",
          "gold-dim": "#a68411",
          emerald: "#2ecc71",
          "emerald-dim": "#1e824c",
          ruby: "#e74c3c",
          sapphire: "#3498db",
          purple: "#9b59b6",
          muted: "#8b949e",
        },
      },
      fontFamily: {
        rpg: ["Cinzel", "serif"],
        ui: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
