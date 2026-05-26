/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Cores premium inspiradas no Nubank e Linear (Dark mode e Light mode harmoniosos)
        background: {
          light: '#F8F9FA',
          dark: '#0A0A0C',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#121215',
          darkMuted: '#1E1E24',
        },
        primary: {
          DEFAULT: '#820AD1', // Nubank roxo
          light: '#A33DF2',
          dark: '#5F089E',
        },
        success: '#00B050',
        danger: '#F23A4A',
        warning: '#FF9500',
        info: '#007AFF',
        textMutedLight: '#64748B',
        textMutedDark: '#8E9AA8',
        border: {
          light: '#E2E8F0',
          dark: '#1F222A',
        },
      },
    },
  },
  plugins: [],
}
