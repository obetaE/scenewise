/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Scenewise — premium dark theme, ported from the web mockup's oklch tokens
        background: "#201c19",
        foreground: "#fafaf8",
        card: "#2b2723",
        "card-foreground": "#fafaf8",
        popover: "#282420",
        primary: "#d9b96a",
        "primary-foreground": "#3a2e16",
        "primary-glow": "#e9cf8f",
        secondary: "#332e28",
        "secondary-foreground": "#f5f4f2",
        muted: "#312c27",
        "muted-foreground": "#b7ac9c",
        accent: "#94e8bf",
        "accent-foreground": "#1a3327",
        warning: "#e2a468",
        "warning-foreground": "#3a2410",
        destructive: "#d0574a",
        "destructive-foreground": "#fafaf8",
        border: "rgba(255,255,255,0.1)",
        input: "rgba(255,255,255,0.14)",
        ring: "#d9b96a",
      },
      fontFamily: {
        display: ["Fraunces_600SemiBold", "serif"],
        sans: ["PlusJakartaSans_400Regular", "sans-serif"],
        "sans-medium": ["PlusJakartaSans_500Medium", "sans-serif"],
        "sans-semibold": ["PlusJakartaSans_600SemiBold", "sans-serif"],
      },
      borderRadius: {
        sm: "12px",
        md: "14px",
        lg: "20px",
        xl: "24px",
        "2xl": "28px",
        "3xl": "32px",
      },
    },
  },
  plugins: [],
};
