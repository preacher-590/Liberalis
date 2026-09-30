/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // CRITIQUE — sans cette ligne, dark: ne fonctionne pas du tout
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F6E56',
          hover: '#1D9E75',
        },
        secondary: {
          DEFAULT: '#1D9E75',
        },
        background: {
          primary: '#FFFFFF',
          secondary: '#F4F6F5',
          tertiary: '#E1F5EE',
        },
        status: {
          warning: '#EF9F27',
          error:   '#E24B4A',
          success: '#1D9E75',
        },
        text: {
          main:      '#1A1A1A',
          secondary: '#6B7280',
        },

        // Couleurs dédiées au mode sombre
        // Usage : dark:bg-dark-surface  dark:text-dark-muted
        dark: {
          bg:      '#0F172A',
          surface: '#1E293B',
          border:  '#334155',
          muted:   '#64748B',
          primary: '#2DD4BF', // Teal-400 pour un contraste WCAG optimal sur fond sombre
        },
      },

      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        sans:  ['Inter', 'sans-serif'],
      },

      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
      },

      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },

  plugins: [],
}