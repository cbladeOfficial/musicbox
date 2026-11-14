/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        feishin: {
          bg: '#0f1115',
          sidebar: '#14171d',
          surface: '#181b22',
          surfaceHover: '#20252e',
          surfaceActive: '#262c37',
          border: '#2a303c',
          text: '#e6edf3',
          muted: '#8b949e',
          accent: '#2f81f7',
          accentHover: '#388bfd',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
