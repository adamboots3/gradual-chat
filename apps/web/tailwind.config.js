/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rail: '#0C0E12',
        panel: '#26252C',
        'panel-alt': '#2E2D37',
        hover: '#3A3945',
        line: '#353440',
        mint: '#82D8BD',
        accent: '#7FD8BD',
        ink: '#0B2B22',
        content: '#FCFBFE',
        muted: '#8E8C99',
        badge: '#E5484D',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        popover: '0 18px 40px -12px rgba(0, 0, 0, 0.65)',
        soft: '0 1px 2px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};
