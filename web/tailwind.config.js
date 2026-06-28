/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:      'var(--c-bg)',
        surface: 'var(--c-surface)',
        panel:   'var(--c-panel)',
        neutral: 'var(--c-text)',
        muted:   'var(--c-muted)',
        dim:     'var(--c-dim)',
        ghost:   'var(--c-ghost)',
        coral:   '#A8CC3A',
        violet:  '#C4956A',
        rose:    '#F43F5E',
      },
      fontFamily: {
        sans:    ["'Plus Jakarta Sans'", 'sans-serif'],
        display: ["'Fredericka the Great'", 'serif'],
      },
      borderRadius: {
        sm: '13px',
        DEFAULT: '14px',
        lg: '16px',
        xl: '18px',
      },
      backdropBlur: {
        xs: '6px',
        sm: '12px',
        md: '24px',
      },
      boxShadow: {
        glass: 'rgba(0,0,0,0.45) 0px 30px 80px 0px, rgba(139,92,246,0.12) 0px 0px 70px 0px, rgba(255,255,255,0.08) 0px 1px 0px 0px inset',
        coral: 'rgba(255,106,85,0.25) 0px 20px 40px -10px',
        violet: 'rgba(139,92,246,0.4) 0px 20px 35px -14px',
      },
      animation: {
        'fade-in':  'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
