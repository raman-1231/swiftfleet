/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F4FF',
          100: '#E0E8FF',
          200: '#C7D6FE',
          300: '#A4BCFD',
          400: '#7B9BFA',
          500: '#3457E5', // Primary brand cobalt
          600: '#2846C7', // Hover
          700: '#1F37A4',
          800: '#1B2E83',
          900: '#1A296D',
        },
        ink: {
          950: '#0B0F19',
          900: '#0F172A', // Slate-900 typography
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B', // Secondary text
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0', // Border subtle
          100: '#F1F5F9', // Border light / subtle background
          50: '#F8FAFC',  // Canvas background
        },
        ops: {
          success: '#16865C', // Mint/green operational success
          'success-light': '#E8F5E9',
          warning: '#B7791F', // Amber warning
          'warning-light': '#FEF3C7',
          danger: '#C83D4D',  // Crimson danger
          'danger-light': '#FEE2E2',
          info: '#2563EB',
          'info-light': '#EFF6FF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'elevated': '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
      }
    },
  },
  plugins: [],
}
