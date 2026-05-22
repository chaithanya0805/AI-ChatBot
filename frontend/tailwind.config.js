/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          cyan: '#00f0ff',
          blue: '#0066ff',
          dark: '#020617',
          darker: '#000000',
        }
      },
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.5))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.8))' },
        },
        'wave': {
          '0%': { height: '8px' },
          '50%': { height: '24px' },
          '100%': { height: '8px' },
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        'scan-line': 'scan-line 8s linear infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
