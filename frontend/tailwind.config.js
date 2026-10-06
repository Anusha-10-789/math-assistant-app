/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Rounded, friendly faces that stay very readable for young children.
        sans: ["Nunito", "ui-rounded", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Fredoka", "Nunito", "ui-rounded", "system-ui", "sans-serif"],
      },
      colors: {
        // The app's brand colour. Components use the `indigo-*` names, so the
        // whole app picks up this brighter violet without renaming classes.
        indigo: {
          50: "#f4f2ff",
          100: "#ebe7ff",
          200: "#d9d1ff",
          300: "#bcaeff",
          400: "#9b82fc",
          500: "#7d58f6",
          600: "#6a3aeb",
          700: "#5a2bd2",
          800: "#4b25ab",
          900: "#3f2289",
          950: "#26135c",
        },
      },
      borderRadius: {
        lg: "0.875rem",
        xl: "1.125rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        sm: "0 1px 2px rgb(30 20 80 / 0.06), 0 1px 3px rgb(30 20 80 / 0.04)",
        DEFAULT: "0 2px 6px rgb(30 20 80 / 0.07), 0 1px 2px rgb(30 20 80 / 0.05)",
        md: "0 6px 16px -4px rgb(30 20 80 / 0.10), 0 2px 4px rgb(30 20 80 / 0.05)",
        lg: "0 18px 40px -16px rgb(30 20 80 / 0.18), 0 4px 10px -4px rgb(30 20 80 / 0.06)",
        xl: "0 28px 60px -20px rgb(30 20 80 / 0.25), 0 8px 18px -8px rgb(30 20 80 / 0.08)",
        pop: "0 4px 0 0 rgb(0 0 0 / 0.12)",
      },
    },
  },
  plugins: [],
};
