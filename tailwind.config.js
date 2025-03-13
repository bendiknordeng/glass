/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          // Lively pastel color palette
          'pastel-blue': '#A6D0DD',
          'pastel-pink': '#FFB6C1',
          'pastel-yellow': '#FFE5B4',
          'pastel-green': '#B5EAD7',
          'pastel-purple': '#C7CEEA',
          'pastel-orange': '#FFD8B1',
          'game-primary': '#FF6B6B',
          'game-secondary': '#4ECDC4',
          'game-accent': '#FFD166',
          'game-dark': '#2A2D34',
          'game-light': '#F7FFF7',
        },
        animation: {
          'bounce-slow': 'bounce 2s infinite',
          'pulse-fast': 'pulse 1s infinite',
          'pulse-slow': 'pulse 3s ease-in-out infinite',
          'spin-slow': 'spin 3s linear infinite',
          'wiggle': 'wiggle 1s ease-in-out infinite',
        },
        keyframes: {
          wiggle: {
            '0%, 100%': { transform: 'rotate(-3deg)' },
            '50%': { transform: 'rotate(3deg)' },
          }
        },
        fontFamily: {
          'game': ['Nunito', 'sans-serif'],
        },
      },
    },
    plugins: [],
  }