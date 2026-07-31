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
        void: '#05070B',
        floor: '#0D111A',
        panel: 'rgba(18, 24, 38, 0.75)',
        cyber: {
          cyan: '#06B6D4',
          indigo: '#6366F1',
          emerald: '#10B981',
          amber: '#F59E0B',
        },
      },
      animation: {
        'laser-scan': 'laserScan 2.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        laserScan: {
          '0%': { top: '0%', opacity: '0.9' },
          '50%': { top: '95%', opacity: '0.9' },
          '100%': { top: '0%', opacity: '0.9' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.8))' },
          '50%': { opacity: 0.5, filter: 'drop-shadow(0 0 2px rgba(6, 182, 212, 0.3))' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'glass-bevel': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
        'ambient': '0 20px 50px rgba(0,0,0,0.7)',
        'neon-cyan': '0 0 25px rgba(6, 182, 212, 0.35)',
        'neon-indigo': '0 0 25px rgba(99, 102, 241, 0.35)',
      },
    },
  },
  plugins: [],
}
