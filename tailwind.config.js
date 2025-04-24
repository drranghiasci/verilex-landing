/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './app/**/*.{ts,tsx,js,jsx}',
      './components/**/*.{ts,tsx,js,jsx}',
      './pages/**/*.{ts,tsx,js,jsx}',
    ],
    darkMode: 'class',          // you’re already toggling themes via a class
    theme: {
      extend: {
        /* expose your CSS variables inside Tailwind’s theme if you like */
        colors: {
          background: 'var(--background)',
          foreground: 'var(--foreground)',
          accent: 'var(--accent)', // new accent token
          border: 'var(--border)', // new border token
        },
      },
    },
    plugins: [],
  };
