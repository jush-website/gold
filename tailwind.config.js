/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './preview.html', './src/**/*.{js,jsx}'],
  // 深色是預設，淺色靠 .theme-light 換掉 CSS 變數，
  // 所以整份程式碼不需要任何 dark: 變體。
  theme: {
    extend: {
      colors: {
        ground:    'rgb(var(--c-ground) / <alpha-value>)',
        'ground-2':'rgb(var(--c-ground-2) / <alpha-value>)',
        surface:   'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2':'rgb(var(--c-surface-2) / <alpha-value>)',
        'surface-3':'rgb(var(--c-surface-3) / <alpha-value>)',
        ink:       'rgb(var(--c-text) / <alpha-value>)',
        'ink-2':   'rgb(var(--c-text-2) / <alpha-value>)',
        'ink-3':   'rgb(var(--c-text-3) / <alpha-value>)',
        gold:      'rgb(var(--c-gold) / <alpha-value>)',
        'gold-deep':'rgb(var(--c-gold-deep) / <alpha-value>)',
        gain:      'rgb(var(--c-gain) / <alpha-value>)',
        loss:      'rgb(var(--c-loss) / <alpha-value>)',
        info:      'rgb(var(--c-info) / <alpha-value>)',
        line:      'rgb(var(--line) / var(--line-alpha))',
        'line-strong': 'rgb(var(--line) / var(--line-alpha-strong))',
      },
      borderColor: {
        DEFAULT: 'rgb(var(--line) / var(--line-alpha))',
      },
      fontFamily: {
        sans: ['Instrument Sans', 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', 'system-ui', 'sans-serif'],
        figure: ['Fraunces', 'Noto Serif TC', 'Songti TC', 'Source Han Serif TC', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        gold: 'var(--glow-gold)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'riseIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
