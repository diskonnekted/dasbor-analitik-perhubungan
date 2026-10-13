/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palet utama biru (Accessible & Ethical style)
        primary: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",  // secondary accent
          600: "#2563EB",  // hover
          700: "#1D4ED8",
          800: "#1E40AF",  // primary
          900: "#1E3A8A",  // foreground
        },
        accent: {
          50:  "#F0FDF4",
          100: "#DCFCE7",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",  // CTA / layanan
          700: "#15803D",
        },
        // Alias semantik (untuk konsistensi di seluruh app)
        canvas:    "#EFF6FF",  // body background
        surface:   "#FFFFFF",  // card
        muted:     "#E9EFF5",  // muted surface
        border:    "#BFDBFE",  // garis pemisah
        ink:       "#1E3A8A",  // teks utama
        subink:    "#475569",  // teks sekunder
        accentGreen: "#16A34A",
        destructive: "#DC2626",
        warning:    "#D97706",
        info:       "#0284C7",
      },
      fontFamily: {
        // Fira Sans untuk body, Fira Code untuk data/teknis
        sans:  ['"Fira Sans"', "system-ui", "sans-serif"],
        mono:  ['"Fira Code"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        // Soft elevation menggantikan shadow-brut offset solid
        sm: "0 1px 2px 0 rgba(15, 23, 42, 0.05)",
        DEFAULT: "0 2px 4px 0 rgba(15, 23, 42, 0.06), 0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        md: "0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)",
        lg: "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.05)",
        xl: "0 20px 25px -5px rgba(15, 23, 42, 0.10), 0 8px 10px -6px rgba(15, 23, 42, 0.05)",
        ring: "0 0 0 3px rgba(30, 64, 175, 0.25)",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(4px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: 1 },
          "50%":      { opacity: 0.6 },
        },
      },
      animation: {
        "fade-in":    "fade-in 200ms ease-out both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
