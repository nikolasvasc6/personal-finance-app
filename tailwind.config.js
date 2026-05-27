/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Paleta light/azul (estilo kie.ai) — espelha src/core/theme.ts
        background: {
          DEFAULT: '#FFFFFF',
          muted: '#FAFBFC',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F1F5F9',
        },
        border: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },
        foreground: {
          DEFAULT: '#020817',
          muted: '#64748B',
          subtle: '#94A3B8',
          disabled: '#CBD5E1',
        },
        primary: {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          dark: '#1D4ED8',
          soft: '#EFF6FF',
        },
        success: {
          DEFAULT: '#059669',
          soft: '#ECFDF5',
        },
        danger: {
          DEFAULT: '#E11D48',
          soft: '#FFE4E6',
        },
        warning: {
          DEFAULT: '#F59E0B',
          soft: '#FEF3C7',
        },
        info: {
          DEFAULT: '#0EA5E9',
          soft: '#E0F2FE',
        },
      },
    },
  },
  plugins: [],
}
