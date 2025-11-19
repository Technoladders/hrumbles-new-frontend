import type { Config } from "tailwindcss";
import merge from "lodash.merge";
import subProjectConfig from "./src/pages/careerPage/tailwind.config";

const mainConfig: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@material-tailwind/react/components/**/*.{js,tsx}",
    "./node_modules/@material-tailwind/react/theme/components/**/*.{js,tsx}",
    "./subproject/**/*.{ts,tsx}",
    "!./pages/careerPage/**/*.{ts,tsx}", // Exclude subproject content
    "!./components/careerPage/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        brand: {
          primary: "#1C1C1C",
          secondary: "#6B6B6B",
          accent: "#FFD337",
        },
        status: {
          invited: "#4BAE4F",
          absent: "#8E8E8E",
        },
        // Extra Custom Colors
        "blue-50": "#f0f7ff",
        "blue-100": "#e0f0ff",
        "blue-200": "#c0e0ff",
        "blue-500": "#4285F4",
        "yellow-50": "#fffbeb",
        "yellow-100": "#fef3c7",
        "green-50": "#f0fdf4",
        "green-100": "#dcfce7",
        "purple-50": "#faf5ff",
        "purple-100": "#f3e8ff",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        slideUpFade: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)" },
          "50%": { boxShadow: "0 0 30px rgba(139, 92, 246, 0.8)" },
        },
        "shimmer-slow": {
          "0%": { transform: "translateX(-200%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "flow-gradient": {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "liquid-flow": {
          "0%": { transform: "translateX(-120%)" },
          "50%": { transform: "translateX(120%)" },
          "100%": { transform: "translateX(-120%)" },
        },
        "liquid-flow1": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "200% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },

        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "shimmer-soft": {
          "0%": { backgroundPosition: "-200% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        // Light sweep – perfectly synced and bounded
        "shimmer-perfect": {
          "0%": { backgroundPosition: "-200% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        waterfall: {
          "0%": { transform: "translateY(-150%)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "0.4" },
          "100%": { transform: "translateY(250%)", opacity: "0" },
        },
        // Extra Animations
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
wave: {
  "0%": { backgroundPosition: "0% 50%" },
  "50%": { backgroundPosition: "100% 50%" },
  "100%": { backgroundPosition: "0% 50%" },
},
textReveal: {
  "0%": { opacity: "0", transform: "translateY(12px)" },
  "100%": { opacity: "1", transform: "translateY(0)" },
},

        floatLoop: {
          "0%, 100%": {
            transform: "translateY(0px)",
            opacity: "1",
          },
          "50%": {
            transform: "translateY(-4px)",
            opacity: "0.9",
          },
        },
        slideText: {
          "0%": {
            transform: "translateX(-100%)",
            opacity: "0",
          },
          "50%": {
            transform: "translateX(0)",
            opacity: "1",
          },
          "100%": {
            transform: "translateX(100%)",
            opacity: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up-fade": "slideUpFade 0.5s ease-out forwards",
        "scale-in": "scaleIn 0.4s ease-out forwards",
        "slide-in-right": "slideInRight 0.5s ease-out forwards",
        // Extra Animations
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        floatLoop: "floatLoop 1.6s ease-in-out infinite",
        waterfall: "waterfall 1.8s linear infinite",
        slideText: "slideText 2s ease-in-out",
        shimmer: "shimmer 3s linear infinite",
        "liquid-flow": "liquid-flow 7s ease-in-out infinite",
        "liquid-flow1": "liquid-flow1 7s ease-in-out infinite",
        "shimmer-slow": "shimmer-slow 5s linear infinite",
        "gradient-x": "gradient-x 14s ease-in-out infinite",
        "shimmer-soft": "shimmer-soft 10s linear infinite",
        "shimmer-perfect": "shimmer-perfect 10s linear infinite",
        wave: "wave 6s ease-in-out infinite",
"text-reveal": "textReveal 0.45s ease forwards",

        pulseGlow: "pulseGlow 4s ease-in-out infinite",
        "flow-gradient": "flow-gradient 8s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-main": "linear-gradient(to bottom, #FFFFFF, #FFF9E7)",
        "login-gradient":
          "linear-gradient(to right, #40c975, rgba(53, 31, 105, 0.8))",
      },
      maxWidth: {
        "8xl": "96rem", // ~1536px; or use '100%'/'90vw' for fluid, but stick to rem for consistency
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default merge({}, mainConfig, subProjectConfig) satisfies Config;
