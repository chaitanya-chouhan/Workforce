/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '420px',
      },
      colors: {
        obsidian: '#090B0E',
        charcoal: '#171B20',
        'slate-surface': '#272D34',
        'neon-orange': '#FF6A00',
        'glow-orange': '#FF9A3C',
        'soft-white': '#E7EAEE',
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#FF6A00',
          600: '#FF6A00',
          700: '#e55f00',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
