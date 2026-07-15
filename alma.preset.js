/**
 * alma · preset Tailwind derivado de alma-tokens.css (v1.0)
 * Fuente de verdad: src/styles/alma-tokens.css — no agregar valores que no existan ahí.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        verde: {
          50: '#EFF6F3', 100: '#DCEDE6', 200: '#B9DBCE', 300: '#8FC4B0',
          400: '#57A28A', 500: '#2C806A', 600: '#0E5F4C', 700: '#0A4A3B',
          800: '#073226', 900: '#04201A',
        },
        neutral: {
          0: '#FFFFFF', 50: '#F7F7F3', 100: '#F0F0EB', 200: '#E8E8E2',
          300: '#D6D6CE', 400: '#B3B4AB', 500: '#8B8C85', 600: '#6E6F68',
          700: '#52534D', 800: '#33342F', 900: '#191A17',
        },
        warning: '#A8641C',
        error: '#B3261E',
        info: '#446A85',
      },
      fontFamily: {
        voice: ['var(--alma-font-voice)'],
        sans: ['var(--alma-font-ui)'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px' },
      boxShadow: {
        1: '0 1px 2px rgb(25 26 23/.05),0 4px 16px rgb(25 26 23/.04)',
        2: '0 8px 24px rgb(25 26 23/.10)',
        brand: '0 8px 24px rgb(14 95 76/.25)',
      },
      transitionTimingFunction: { alma: 'cubic-bezier(.2,0,0,1)' },
      transitionDuration: { micro: '150ms', std: '220ms', sign: '350ms' },
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    },
  },
};
