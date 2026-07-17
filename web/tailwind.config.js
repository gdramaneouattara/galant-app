/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ef4444", // Le rouge Galant
        secondary: "#8b5cf6", // Le violet Boost
        accent: "#f59e0b", // L'or des Roses
      }
    },
  },
  plugins: [],
}
