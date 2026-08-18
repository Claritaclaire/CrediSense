/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        indigo: {
          DEFAULT: "#4E156D", // Violet institutionnel CCA Bank
          dark: "#350B4C",    // Violet profond CCA Bank
          light: "#6B21A8",   // Violet d'accentuation
        },
        cca: {
          violet: "#4E156D",
          dark: "#350B4C",
          purple: "#6B21A8",
          gold: "#E5A91A",
          blue: "#0284C7",
        },
        or: "#E5A91A",        // Jaune Or / Ambre de l'affiche CCA Bank
        papier: "#F9F8FA",
        vert: "#2E7D32",
        argile: "#9B4B3F",
        ardoise: "#5A5463",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};