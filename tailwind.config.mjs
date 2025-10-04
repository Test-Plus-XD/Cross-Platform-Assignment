/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts,scss}",
    "./src/app/**/*.html",
    "./src/app/**/*.ts"
  ],
  theme: {
    extend: {
      colors: {
        brand: "#FF6600",
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}