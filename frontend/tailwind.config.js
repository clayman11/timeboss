/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ff6600',      // Construction orange
        secondary: '#0072b1',    // Blueprint blue
        steel: '#3a3a3a'         // Steel grey
      }
    }
  },
  plugins: []
};