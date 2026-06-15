/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'medium-aquamarine': '#00b4b4',
        'light-aquamarine': '#e0f5f5',
        'medium-aquamarine-dark': '#008080',
        /** @deprecated — utiliser sojori-gold */
        'orange': '#E6B022',
        'orange-dark': '#B8881A',
        'sojori-gold': '#E6B022',
        'sojori-gold-soft': '#F4CF5E',
        'sojori-gold-deep': '#B8881A',
        'sojori-violet': '#8B5CF6',
        'sojori-cyan': '#06B6D4',
      },
      backgroundImage: {
        'logo-airbnb': "url('/src/assets/images/illustrations/airbnb.webp')",
        'logo-marriott': "url('/src/assets/images/illustrations/marriott.svg')",
        'logo-booking': "url('/src/assets/images/illustrations/booking.svg')",
        'logo-vrbo': "url('/src/assets/images/illustrations/vrboLogo.svg')",


      },
      screens: {
        'xs': '480px',
      },
    },
    borderWidth: {
      '1': '1px',
    },
  },
  plugins: [require('tailwind-scrollbar'),
  ],
}


