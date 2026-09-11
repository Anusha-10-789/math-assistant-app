import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  // GitHub Pages serves a project site at /<repo-name>/, not at the domain
  // root — only applies to the production build, so the local dev server
  // (npm run dev) is unaffected and still serves from /.
  base: command === "build" ? "/math-assistant-app/" : "/",
  plugins: [react()],
  server: {
    port: 5185,
    strictPort: true,
  },
}));
