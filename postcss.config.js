/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // ✅ This is the fix
    autoprefixer: {},
  },
};
