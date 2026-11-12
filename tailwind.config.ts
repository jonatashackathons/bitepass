import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        culinary: {
          bg: '#FAF9F5',
          surface: '#FFFFFF',
          card: '#FDFDFB',
          border: '#EAE7DF',
          subtle: '#F4F1EA',
          text: '#1C1917',
          // WCAG 2.1 AA verified >= 4.5:1 against #FFFFFF and #FAF9F5
          muted: '#57534E',
          graphic: '#8A837C',
          terracotta: '#BF3E21',
          terracottaFill: '#E05A38',
          amber: '#A84D0A',
          sage: '#047857',
        },
        paypal: {
          blue: '#0070BA',
          dark: '#003087',
          hover: '#005EA6',
          light: '#EBF3FC',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(28, 25, 23, 0.05)',
        culinary:
          '0 10px 30px -10px rgba(28, 25, 23, 0.08), 0 4px 12px -2px rgba(28, 25, 23, 0.04)',
        'culinary-lg':
          '0 20px 40px -15px rgba(28, 25, 23, 0.12), 0 8px 16px -4px rgba(28, 25, 23, 0.06)',
        'culinary-hover':
          '0 25px 50px -12px rgba(224, 90, 56, 0.15), 0 10px 20px -5px rgba(28, 25, 23, 0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
