import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: "src/frontend",
  base: "./",
  build: {
    outDir: "../../static/frontend",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      ...(mode === "demo" ? { "@forge/bridge": path.resolve(import.meta.dirname, "src/frontend/dev/bridge-mock.ts") } : {}),
      "@": path.resolve(import.meta.dirname, "src"),
      "@frontend": path.resolve(import.meta.dirname, "src/frontend"),
      "@backend": path.resolve(import.meta.dirname, "src/backend"),
      "@domain": path.resolve(import.meta.dirname, "src/domain"),
    },
  },
  server: {
    port: 3000,
  },
}));