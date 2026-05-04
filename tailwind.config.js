/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'brand-bg': '#E2EBE1', // Your official logo background
        'brand-orange': '#F2A65A', // From the logo gradient
        'brand-teal': '#4DB6AC',   // From the logo gradient
      }
    },
  },
  plugins: [],
}