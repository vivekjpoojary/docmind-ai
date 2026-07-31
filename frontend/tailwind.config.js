/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        obsidian: {
          DEFAULT: '#090D16',
          floor: '#0E1422',
          panel: 'rgba(21, 29, 46, 0.65)',
        },
        royal: {
          violet: '#4F46E5',
          sky: '#38BDF8',
          mint: '#34D399',
        },
      },
      animation: {
        'laser-scan': 'laserScan 2.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        laserScan: {
          '0%': { top: '0%', opacity: '0.9' },
          '50%': { top: '95%', opacity: '0.9' },
          '100%': { top: '0%', opacity: '0.9' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.8))' },
          '50%': { opacity: 0.5, filter: 'drop-shadow(0 0 2px rgba(56, 189, 248, 0.3))' },
        },
      },
      boxShadow: {
        'glass-bevel': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
        'obsidian': '0 20px 50px rgba(0,0,0,0.85)',
        'glow-violet': '0 0 25px rgba(79, 70, 229, 0.4)',
        'glow-sky': '0 0 25px rgba(56, 189, 248, 0.4)',
      },
    },
  },
  plugins: [],
}
