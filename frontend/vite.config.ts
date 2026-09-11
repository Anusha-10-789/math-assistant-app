import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Deployed to the anusha-10-789.github.io user-page repo, which GitHub
  // Pages serves at the domain root (no /<repo-name>/ path suffix) — so no
  // special production base path is needed here, unlike a project-page repo.
  plugins: [react()],
  server: {
    port: 5185,
    strictPort: true,
  },
});
