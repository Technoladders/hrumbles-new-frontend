/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"], // ✅ Enable dark mode support
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // ✅ Include your existing project structure
    "./pages/**/*.{ts,tsx}", // ✅ Include Client module pages
    "./components/**/*.{ts,tsx}", // ✅ Include Client module components
    "./app/**/*.{ts,tsx}", // ✅ Include Client app files
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Readex Pro", "sans-serif"],
      },
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        gray: {
          light: "var(--gray-light)",
          dark: "var(--gray-dark)",
        }
      },
      borderRadius: {
        lg: "var(--border-radius)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
