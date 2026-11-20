/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#0a0a0a',
          900: '#111111',
          850: '#161616',
          800: '#1e1e1e',
        },
        accent: {
          100: '#fdf0c9',
          200: '#f5e0a3',
          300: '#e6c96f',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
