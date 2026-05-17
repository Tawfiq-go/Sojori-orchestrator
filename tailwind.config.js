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
        'orange': '#FE9E19',
        'orange-dark': '#F4762A',
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


