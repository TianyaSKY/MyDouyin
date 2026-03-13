/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E11D48',
        secondary: '#FB7185',
        cta: '#2563EB',
        background: '#FFF1F2',
        text: '#881337',
        dark: '#000000',
        'dark-grey': '#121212',
        'midnight-blue': '#0A0E27',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float-pulse': 'floatPulse 10s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'modal-pop': 'modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'backdrop-fade': 'backdropFade 0.3s ease-out forwards',
      },
      keyframes: {
        floatPulse: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
        },
        glow: {
          'from': { boxShadow: '0 0 20px rgba(225, 29, 72, 0.3)' },
          'to': { boxShadow: '0 0 40px rgba(225, 29, 72, 0.6)' },
        },
        modalPop: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '50%': { transform: 'scale(1.02)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        backdropFade: {
          '0%': { opacity: '0', backdropFilter: 'blur(0px)' },
          '100%': { opacity: '1', backdropFilter: 'blur(8px)' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}