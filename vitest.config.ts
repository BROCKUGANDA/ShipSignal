import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    exclude: ["**/node_modules/**", "**/dist/**", "**/static/**", "**/.worktrees/**"],
  },
  resolve: {
    alias: {
      "@": "/src",
      "@frontend": "/src/frontend",
      "@backend": "/src/backend",
      "@domain": "/src/domain",
    },
  },
});