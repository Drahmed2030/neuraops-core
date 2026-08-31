import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          navy: '#0B0F19',
          ink: '#111827',
          primary: '#2563EB',
          azure: '#3B82F6',
          violet: '#7C3AED',
          cyan: '#06B6D4',
          mist: '#E5E7EB',
        },
        attention: {
          DEFAULT: '#D6B15E',
          dark: '#B89445',
          soft: '#F4E4C1',
        },
        gold: {
          DEFAULT: '#C9A961',
          hover: '#B8944F',
          light: '#F4E4C1',
        },
        ink: {
          950: '#050507',
          900: '#0C0C10',
          800: '#111114',
        },
        paper: {
          50: '#F7F6F2',
          100: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        'brand-glow': '0 10px 32px -10px rgba(37, 99, 235, 0.45)',
        'gold-glow': '0 8px 30px -8px rgba(201, 169, 97, 0.35)',
        'card-dark': '0 8px 30px rgba(0,0,0,0.45)',
        'card-light': '0 8px 30px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-slide': 'fadeSlide 0.4s cubic-bezier(0.4,0,0.2,1)',
        'success-pop': 'successPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeSlide: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        successPop: {
          from: { transform: 'scale(0)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
}

export default config
