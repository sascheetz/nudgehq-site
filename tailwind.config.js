/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        ink: '#1a1d23',
        subink: '#4a5568',
        muted: '#9aa5b4',
        accent: '#5a67d8',
        fire: '#e53e3e',
        soon: '#dd6b20',
        ok: '#3182ce',
        chill: '#38a169',
        missing: '#805ad5',
        student: '#f97316',
        zeroed: '#e53e3e',
        surface: '#ffffff',
        surface2: '#f8f9fa',
        bord: '#e2e6ea',
        bord2: '#c8cdd4',
      },
      animation: {
        'slide-in': 'slideIn 0.25s ease',
        'fade-up': 'fadeUp 0.3s ease both',
        'pulse-soft': 'pulseSoft 1.3s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(9px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
