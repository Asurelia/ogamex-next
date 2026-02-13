/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // OGame color palette
        'ogame-bg': '#0d1117',
        'ogame-panel': '#111b24',
        'ogame-border': '#333',
        'ogame-text': '#f1f1f1',
        'ogame-text-muted': '#848484',
        'ogame-text-header': '#6f9fc8',
        'ogame-accent': '#ff9600',
        'ogame-metal': '#cccccc',
        'ogame-crystal': '#77bbff',
        'ogame-deuterium': '#00cc99',
        'ogame-energy': '#ffcc00',
        'ogame-dark-matter': '#aa88ff',
        'ogame-positive': '#23d2b7',
        'ogame-negative': '#ff4444',
      },
      fontFamily: {
        'ogame': ['Verdana', 'Arial', 'Helvetica', 'sans-serif'],
      },
      fontSize: {
        'xxs': '10px',
        'xs': '11px',
        'sm': '12px',
        'base': '13px',
        'lg': '14px',
        'xl': '16px',
        '2xl': '18px',
        '3xl': '20px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      backgroundImage: {
        'space': "url('/img/background-large.jpg')",
        'panel-gradient': 'linear-gradient(180deg, #1a2a3a 0%, #111b24 100%)',
      },
      boxShadow: {
        'ogame': '0 0 5px rgba(0, 0, 0, 0.5)',
        'ogame-inset': 'inset 0 0 5px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'countdown': 'countdown 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
