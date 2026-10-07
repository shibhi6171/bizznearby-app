/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { blue: '#1d5fe0', green: '#3fc45a', red: '#c62828', deal: '#ffb020' },
        ink: { DEFAULT: '#0b1220', soft: '#5b6678', line: '#e3e8ef', bg: '#f8fafc' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
    },
  },
  plugins: [],
};
