/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './app/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
    ],
    darkMode: 'class', // <-- enables class-based dark mode
    theme: {
      extend: {
        // optional: extend colors, spacing, fonts here
      },
    },
    plugins: [],
  }
  