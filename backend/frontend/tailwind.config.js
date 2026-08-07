/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2563EB',
          secondary: '#10B981',
        },
        slate: {
          50: '#F8FAFC',
          200: '#E2E8F0',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'typing': {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out forwards',
        'typing': 'typing 1.4s infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
