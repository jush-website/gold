/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // 底部導覽列的指示條用 activeColor.replace('text-','bg-') 在執行期組出類別名稱，
  // Tailwind 掃描原始碼時看不到，必須明確保留。
  safelist: [
    'bg-gray-800', 'bg-blue-600', 'bg-purple-600',
    'bg-orange-500', 'bg-rose-600', 'bg-yellow-500',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
