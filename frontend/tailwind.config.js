/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8eaf0',
          100: '#c5c9d8',
          500: '#1B263B',
          600: '#0D1B2A',
          700: '#0a1520',
          800: '#060d14',
          900: '#030609',
        },
        teal: {
          400: '#48CAE4',
          500: '#00B4D8',
          600: '#0077A8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}