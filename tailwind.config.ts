import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Paleta oficial ReLivra (Brand Identity Kit) ───
        verde: {
          deep: '#2D6A4F',   // Primário — CTAs, headers escuros
          mid:  '#40916C',   // Secundário — gradientes, hover
          mint: '#74C69D',   // Accent — destaques, "livra" do logo
          pale: '#B7E4C7',   // Suave — backgrounds leves, badges
          // Escala numérica para compat com componentes existentes (badges de estado, etc.)
          50:  '#F0FAF4',
          100: '#DCF3E5',
          200: '#B7E4C7',
          300: '#74C69D',
          400: '#52A97F',
          500: '#40916C',
          600: '#2D6A4F',
          700: '#235940',
          800: '#1B4332',
          900: '#163328',
        },
        creme: {
          DEFAULT: '#F8F4ED',
          dark: '#EDE8DF',
        },
        grafite: {
          DEFAULT: '#1C1C1E',
          mid:   '#3A3A3C',
          light: '#8E8E93',
        },
        // Mantido para compatibilidade com componentes (FiltrosLivros, BookCard, etc.)
        areia: {
          50:  '#F8F4ED',
          100: '#EDE8DF',
          200: '#DDD8CE',
          300: '#C7C0B3',
          400: '#8E8E93',
          500: '#3A3A3C',
        },
        // Tons de estado do livro
        otimo:   '#2D6A4F',
        bom:     '#74C69D',
        regular: '#D4A24C',
        ruim:    '#C75450',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(28,28,30,0.06), 0 1px 2px -1px rgba(28,28,30,0.06)',
        'card-hover': '0 4px 12px 0 rgba(28,28,30,0.10)',
        float: '0 8px 24px 0 rgba(28,28,30,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-green': 'pulseGreen 2s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(45,106,79,0.3)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(45,106,79,0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
