/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      fontWeight: {
        black: '800',
      },
      letterSpacing: {
        prestige: '.16em',
      },
      colors: {
        primary: "#ef4444", // Le rouge Galant
        secondary: "#8b5cf6", // Le violet Boost
        accent: "#f59e0b", // L'or des Roses
      }
    },
  },
  plugins: [],
}
