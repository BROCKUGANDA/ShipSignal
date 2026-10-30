import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: "src/frontend",
  base: "./",
  build: {
    outDir: "../../static/frontend",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@frontend": path.resolve(__dirname, "src/frontend"),
      "@backend": path.resolve(__dirname, "src/backend"),
      "@domain": path.resolve(__dirname, "src/domain"),
    },
  },
  server: {
    port: 3000,
  },
});