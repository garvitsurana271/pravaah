/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Control-room palette: deep slate canvas, signal accents.
        panel: '#0d1320',
        panel2: '#131c2e',
        edge: '#1f2c44',
        ink: '#e6edf7',
        muted: '#8aa0c0',
        signal: {
          green: '#22d37a',
          amber: '#ffb02e',
          red: '#ff4d4d',
          blue: '#3aa0ff',
        },
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
        sweep: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        pulse2: 'pulse2 1.1s ease-in-out infinite',
        sweep: 'sweep 2.2s linear infinite',
      },
    },
  },
  plugins: [],
}
