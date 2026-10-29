/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kahoot: {
          purple: {
            DEFAULT: '#46178f',
            dark: '#34116d',
            darker: '#250850',
            deepest: '#14032e',
            light: '#652ca8',
          },
          red: {
            DEFAULT: '#e21b3c',
            hover: '#c61230',
            dark: '#a80d26',
          },
          blue: {
            DEFAULT: '#1368ce',
            hover: '#0f54a8',
            dark: '#0a3d7d',
          },
          yellow: {
            DEFAULT: '#ffa602',
            hover: '#e59500',
            dark: '#bd7b00',
          },
          green: {
            DEFAULT: '#26890c',
            hover: '#1e6d09',
            dark: '#165207',
          },
        },
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    },
  },
  plugins: [],
}
