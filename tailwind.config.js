/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace','SFMono-Regular','Consolas','monospace']
      },
      colors: {
        brand: {
          DEFAULT: '#4f46e5',
          accent: '#6366f1',
          hover: '#4338ca'
        }
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,.08)',
        panel: '0 4px 18px rgba(0,0,0,.08)'
      },
      animation: {
        fade: 'fade .25s ease'
      },
      keyframes: {
        fade: { '0%': { opacity: 0 }, '100%': { opacity: 1 } }
      }
    }
  },
  plugins: []
};
